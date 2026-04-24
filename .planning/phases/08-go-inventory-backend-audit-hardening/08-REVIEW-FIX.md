---
status: all_fixed
phase: 08
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
---

## Code Review Fix Report — Phase 08: go-inventory-backend-audit-hardening

### Summary

All 7 critical and warning findings from the code review have been resolved. Each fix was committed atomically. The 3 info findings (CR-008, CR-009, CR-010) were out of scope for this pass.

---

### CR-001 — TOCTOU race in CreateTransfer ✓ Fixed

**Commit:** `fix(08): atomically lock source stock row inside CreateTransfer transaction to prevent TOCTOU race (CR-001)`

Wrapped the entire `CreateTransfer` body in `s.db.Transaction(...)`. Inside the transaction, the source `InventoryItem` row is acquired with `tx.Clauses(clause.Locking{Strength: "UPDATE"})` before the stock check and INSERT. This prevents concurrent requests from over-committing stock against the same source item, consistent with how `CompleteTransfer` already handles locking.

---

### CR-002 — Inventory entities lack clinic_id ✓ Fixed

**Commit:** `fix(08): add clinic_id to inventory domain structs, repositories, and new migration 000017 (CR-002)`

- Added `ClinicID uint` as the second field to all four domain structs: `Warehouse`, `WarehouseLocation`, `InventoryItem`, `InventoryTransfer`.
- Created migration `000017_add_clinic_id_to_inventory_tables` (up + down) adding `clinic_id BIGINT REFERENCES clinics(id)` with indexes to `warehouse_locations`, `inventory_items`, and `inventory_transfers`. (`warehouses` already had `clinic_id` from migration 014.)
- Added `clinic_id` to filter allowlists in all four repositories so callers can scope queries by clinic.

**Note:** Full enforcement (rejecting cross-clinic reads at every query) requires the JWT `Claims` struct to carry `ClinicID` and all service inputs to propagate it. The JWT claims currently contain only `UserID`, `Email`, and `Role`. This structural gap should be addressed in a follow-up phase.

---

### CR-003 — Migration 000016 UP non-idempotent ✓ Fixed

**Commit:** `fix(08): make migration 000016 idempotent, drop orphaned index, guard NULL rows and missing lenses table (CR-003, CR-004, CR-005)`

Wrapped the `RENAME COLUMN` in a `DO $$ BEGIN ... END $$` block that checks `information_schema.columns` before renaming. Wrapped the `ADD CONSTRAINT` in a similar block checking `information_schema.table_constraints`. The migration is now safe to run multiple times.

---

### CR-004 — Migration 000016 DOWN references lenses table ✓ Fixed

Same commit as CR-003. The DOWN migration now wraps the `ADD CONSTRAINT ... REFERENCES lenses` in a `DO` block that first checks whether the `lenses` table exists in `information_schema.tables`. If not present, the FK restoration is skipped with a documented warning in the SQL comment.

---

### CR-005 — Orphaned index and NULL guard in migration 000016 ✓ Fixed

Same commit as CR-003. Added `DROP INDEX IF EXISTS idx_inventory_transfers_lens_id;` before the rename. Added a pre-flight `DO` block that raises an exception if any `inventory_transfers` row has `lens_id IS NULL` at migration time, preventing the subsequent `SET NOT NULL` from failing silently.

---

### CR-006 — UpdateTransfer notes-only path not transactionally safe ✓ Fixed

**Commit:** `fix(08): wrap UpdateTransfer notes-only path in locked transaction to prevent stale writes (CR-006)`

Refactored `UpdateTransfer`: status-change paths still delegate to `CompleteTransfer`/`CancelTransfer` (which own their own transactions). The notes-only path now opens a transaction, acquires a `SELECT FOR UPDATE` lock on the transfer row, re-validates status, and updates `notes` — all atomically.

---

### CR-007 — DeleteTransfer allows deleting non-pending transfers ✓ Fixed

**Commit:** `fix(08): guard DeleteTransfer against deleting non-pending transfers (CR-007)`

Added a status check in `DeleteTransfer`: if `t.Status != domain.InventoryTransferStatusPending`, returns `ErrValidation` with message `"solo se pueden eliminar transferencias en estado pendiente"`. Completed and cancelled transfers are now protected from hard-deletion, preserving the audit trail.

---

### Out of scope (Info severity)

| Finding | Severity | Reason skipped |
|---------|----------|----------------|
| CR-008: AdjustInventory delta=0 validation | info | Out of fix scope (critical_warning only) |
| CR-009: GetProductInventorySummary hardcoded perPage=1000 | info | Out of fix scope |
| CR-010: verify-inventory.sh test data cleanup | info | Out of fix scope |
