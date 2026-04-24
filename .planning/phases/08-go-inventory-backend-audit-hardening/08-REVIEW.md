---
status: issues_found
phase: 08
files_reviewed: 9
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
---

## Code Review — Phase 08: go-inventory-backend-audit-hardening

### Summary

The inventory backend has a solid foundation: `CompleteTransfer` and `AdjustStockByItemID` both use `SELECT FOR UPDATE` inside `db.Transaction`, the state machine correctly guards pending→completed/cancelled transitions, and the RBAC wiring is consistent. However two critical issues exist: a TOCTOU race in `CreateTransfer` allows a transfer to be created even when another goroutine drains the source stock between the pre-check read and the INSERT, and `CancelTransfer` does not roll back stock even though stock was never moved (cancel on a _pending_ transfer is safe, but calling cancel after `CompleteTransfer` reversed a scenario would be wrong — the state machine blocks that, so this is fine; see details below for the actual critical issue). Separately, the migration `000016` is non-idempotent (`RENAME COLUMN` has no `IF EXISTS` guard), the `DOWN` migration references a `lenses` table that may already be gone, and the `InventoryTransfer` domain struct is missing `clinic_id` which violates the mandatory multi-clinic isolation rule. The `Warehouse` and `WarehouseLocation` structs also lack `clinic_id`, as does the `InventoryItem` struct.

---

### Findings

### CR-001: TOCTOU race in CreateTransfer — stock check is not inside a transaction
**File:** `convision-api-golang/internal/inventory/service.go:606-643`
**Severity:** critical
**Issue:** `CreateTransfer` performs an unprotected `s.db.Where(...).First(&srcItem)` outside any transaction to verify source stock, then inserts the transfer record. If two concurrent requests arrive simultaneously for the same source item, both pass the stock check (`srcItem.Quantity >= input.Quantity`) but only `CompleteTransfer` later re-validates inside a transaction. This means users can create more pending transfers than stock allows, because there is no atomic lock between the stock read and the INSERT. A malicious or busy UI could queue many pending transfers each reserving the same 5 units.
**Fix:** Wrap the entire `CreateTransfer` body in `s.db.Transaction(func(tx *gorm.DB) error { ... })`. Inside the transaction, acquire a row lock with `tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("product_id = ? AND warehouse_location_id = ?", ...).First(&srcItem)`. This is consistent with how `CompleteTransfer` already handles locking.

---

### CR-002: Inventory entities lack `clinic_id` — multi-clinic data isolation violated
**File:** `convision-api-golang/internal/domain/inventory.go:6-93`
**Severity:** critical
**Issue:** `Warehouse`, `WarehouseLocation`, `InventoryItem`, and `InventoryTransfer` structs have no `clinic_id` field. The project architecture mandates that every business table must include `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` as the second column, and every query must begin with `WHERE clinic_id = $1`. Without this, any authenticated user at clinic A can list, read, modify, or transfer stock belonging to clinic B through the existing open-read endpoints. The migration `000015` also creates these tables without `clinic_id`.
**Fix:** Add `ClinicID uint` to all four structs and the corresponding `NOT NULL` column in a new migration. All repository queries (`List`, `GetByID`, `Create`, `TotalStock`, `TotalStockPerProduct`, `ExistsByProductAndLocation`) must be scoped to `clinic_id`. Pass `clinicID` from JWT claims through service inputs and handler extraction, consistent with other guarded entities.

---

### CR-003: Migration 000016 UP is non-idempotent — RENAME COLUMN has no guard
**File:** `convision-api-golang/db/migrations/tenant/000016_rename_lens_id_to_product_id.up.sql:1`
**Severity:** warning
**Issue:** `ALTER TABLE inventory_transfers RENAME COLUMN lens_id TO product_id;` fails if run twice (after the column has already been renamed) or if migration state tracking is out of sync. The project DATABASE_GUIDE requires idempotent migrations (`IF NOT EXISTS`). PostgreSQL does not support `RENAME COLUMN IF EXISTS` natively.
**Fix:** Wrap in a `DO $$ BEGIN ... END $$` block that first checks `information_schema.columns`:
```sql
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inventory_transfers' AND column_name = 'lens_id'
    ) THEN
        ALTER TABLE inventory_transfers RENAME COLUMN lens_id TO product_id;
    END IF;
END $$;
```
Apply the same guard to the subsequent `ADD CONSTRAINT` statement.

---

### CR-004: Migration 000016 DOWN references `lenses` table that may not exist
**File:** `convision-api-golang/db/migrations/tenant/000016_rename_lens_id_to_product_id.down.sql:8`
**Severity:** warning
**Issue:** The DOWN migration restores the FK to `lenses(id)`. If the `lenses` table has been dropped in a later migration, or if this migration is applied to an environment where `lenses` never existed (the active backend uses `products`), the down migration will fail with `ERROR: relation "lenses" does not exist`.
**Fix:** Add an existence check in a `DO` block before adding the foreign key, or document explicitly that the down migration is only safe when the `lenses` table exists. Consider whether this migration is truly reversible in production, and if not, mark it as one-directional in the team's runbook.

---

### CR-005: Migration 000015 creates `inventory_transfers.lens_id` with `ON DELETE SET NULL` — inconsistent with domain
**File:** `convision-api-golang/db/migrations/tenant/000015_warehouse_locations_inventory_items.up.sql:107-113`
**Severity:** warning
**Issue:** Migration 015 creates `inventory_transfers` with `lens_id BIGINT REFERENCES lenses(id) ON DELETE SET NULL` — nullable, soft-delete-friendly. Migration 016 then renames this to `product_id` and changes the FK to `ON DELETE RESTRICT` and `NOT NULL`. The `ON DELETE SET NULL` → `ON DELETE RESTRICT` change on an existing FK is destructive: if any transfer row has `lens_id = NULL` at migration time, the `ALTER COLUMN product_id SET NOT NULL` will fail. Additionally, the index `idx_inventory_transfers_lens_id` created in 015 is never dropped, leaving an orphaned index named incorrectly after the rename.
**Fix:** Add `DROP INDEX IF EXISTS idx_inventory_transfers_lens_id;` at the top of the 016 UP migration (after the rename, the column is `product_id` but the index still carries the old name). Also verify before running 016 that no rows have `lens_id IS NULL`; add a pre-flight check comment or a guard:
```sql
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM inventory_transfers WHERE lens_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot migrate: inventory_transfers has NULL lens_id rows';
    END IF;
END $$;
```

---

### CR-006: `UpdateTransfer` fetches without locking before delegating to CompleteTransfer/CancelTransfer — double-lock risk
**File:** `convision-api-golang/internal/inventory/service.go:768-805`
**Severity:** warning
**Issue:** `UpdateTransfer` calls `s.transferRepo.GetByID(id)` (plain SELECT, no lock) to check status and validate the state transition, then delegates to `CompleteTransfer` or `CancelTransfer` which each start their own separate transaction with `SELECT FOR UPDATE`. Between the first read and the second transaction, another goroutine could change the transfer status. While `CompleteTransfer`/`CancelTransfer` re-validate status inside their own transactions, the error path for `UpdateTransfer`'s own notes update (`t.Notes = input.Notes; s.transferRepo.Update(t)`) is not transactionally safe — it calls `Update` on a snapshot that may be stale.
**Fix:** For the notes-only path (no status change), wrap `GetByID` + `Update` in a transaction with `FOR UPDATE`. For the status-change paths, the delegation to `CompleteTransfer`/`CancelTransfer` is acceptable since they re-validate under lock.

---

### CR-007: `DeleteTransfer` allows deleting completed or cancelled transfers — no guard
**File:** `convision-api-golang/internal/inventory/service.go:807-812`
**Severity:** warning
**Issue:** `DeleteTransfer` only checks existence, then hard-deletes the transfer record regardless of status. Deleting a `completed` transfer destroys an audit trail of a stock movement that already happened. Stock balances are unaffected (GORM uses soft delete via `deleted_at` only if the model has `gorm.Model`; `InventoryTransfer` does not embed it, so this is a hard DELETE).
**Fix:** Add a status guard before deletion:
```go
if t.Status != domain.InventoryTransferStatusPending {
    return &domain.ErrValidation{
        Field:   "status",
        Message: "solo se pueden eliminar transferencias en estado pendiente",
    }
}
```

---

### CR-008: `AdjustInventory` handler accepts `delta=0` — no semantic validation
**File:** `convision-api-golang/internal/transport/http/v1/handler_inventory.go:426-441`
**Severity:** info
**Issue:** The handler's binding tag is `binding:"required"` which for `int` means non-zero. However `required` on a numeric type in Go's validator rejects only the zero value. A delta of `0` would be rejected by `binding:"required"`, which is correct. But there is no `min` or explicit non-zero validator tag documented, and the binding struct uses plain `int` without `binding:"required,ne=0"`. In practice `required` rejects zero for integers in validator/v10, so this is borderline. Explicitly add `binding:"required,ne=0"` to make intent unambiguous.
**Fix:** Change the binding tag to `Delta int \`json:"delta" binding:"required,ne=0"\`` and add a comment explaining that both positive and negative deltas are valid.

---

### CR-009: `GetProductInventorySummary` uses hard-coded perPage=1000 — unbounded fetch
**File:** `convision-api-golang/internal/inventory/service.go:549-558`
**Severity:** info
**Issue:** `GetProductInventorySummary` calls `s.itemRepo.List(..., 1, 1000)` with a fixed page size of 1000. If a product is stored across hundreds of locations (e.g. a high-volume item), this silently truncates results at 1000 without indicating pagination to the caller.
**Fix:** Either add a dedicated `ListByProduct` repository method that fetches all rows without pagination, or implement cursor-based fetching. If the 1000 cap is a deliberate safety limit, document it and return a `has_more` flag in the output struct.

---

### CR-010: `verify-inventory.sh` does not clean up created test data
**File:** `convision-api-golang/scripts/verify-inventory.sh:77-299`
**Severity:** info
**Issue:** The script creates warehouses, locations, inventory items, and transfers but never deletes them. Each script run accumulates test data in the target database. In a shared dev/staging environment this leads to data drift, and the unique code constraint (`VRF-001`) will cause the warehouse creation step to fail on a second run.
**Fix:** Add a cleanup `trap` or a final section that DELETEs the created resources in reverse dependency order (transfers, items, locations B then A, warehouse). Example:
```bash
trap "cleanup" EXIT
cleanup() {
  curl -s -o /dev/null -X DELETE "$BASE_URL/api/v1/inventory-items/$ITEM_A_ID" -H "$(_auth)"
  ...
}
```
