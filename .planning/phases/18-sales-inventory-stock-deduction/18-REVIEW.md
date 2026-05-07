---
phase: "18"
status: issues_found
files_reviewed: 14
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
---

## Summary

The phase correctly implements best-effort stock deduction on sale creation and reversal on cancellation, and adds `default_warehouse_id` to branches end-to-end. However, two critical bugs were found: the branch repository `Update` method silently drops the `default_warehouse_id` column, making the feature non-functional; and the `Cancel` path can double-revert stock if called more than once on an already-cancelled sale. Four warnings cover unsafe integer casting, a missing validation of warehouse–branch ownership, a context parameter that is accepted but never used, and a frontend race condition on warehouse loading. Three informational items cover code quality improvements.

---

### CR-001 (critical): `branch_repository.Update` does not persist `default_warehouse_id`

**File:** `convision-api-golang/internal/platform/storage/postgres/branch_repository.go`  
**Line:** 114–122

The `Update` map passed to `db.Model(b).Updates(...)` contains exactly five columns: `name`, `address`, `city`, `phone`, `email`, `is_active`. The new `default_warehouse_id` column is absent. Calling `PUT /api/v1/branches/:id` with `default_warehouse_id` set will return a 200 and appear to succeed, but the value is never written to the database. The sale service will always see `branch.DefaultWarehouseID == nil` and skip all stock deductions.

**Recommendation:** Add `"default_warehouse_id": b.DefaultWarehouseID` to the Updates map. Because the value is a pointer (`*uint`), this correctly writes `NULL` when clearing the field and writes the warehouse ID when setting it.

---

### CR-002 (critical): Double-cancel causes phantom stock restoration

**File:** `convision-api-golang/internal/sale/service.go`  
**Line:** 422–435

`Cancel` performs `revertStock` before checking or updating the sale status. If a cancelled sale is cancelled again (no idempotency guard, and the API route is not locked down to prevent repeat calls), `revertStock` will find the `StockMovement` created by the first cancellation (`adjustment_add`, `reference_type = 'sale'`) and attempt to reverse it, creating a second `adjustment_add` and inflating stock by the deducted quantity a second time.

`FindBySaleAndProduct` queries only `movement_type = 'exit'`, so on the second cancellation it finds the original exit movement again (still present in the kardex), computes the same `restoredQty`, and adds stock again.

**Recommendation:** At the top of `Cancel`, guard with a status check:
```go
if sale.Status == domain.SaleStatusCancelled {
    return sale, nil // or return an ErrValidation
}
```

---

### CR-003 (warning): `int(total)` truncation in `calcLastPage`

**File:** `convision-api-golang/internal/sale/service.go`  
**Line:** 138–147

`calcLastPage(total int64, perPage int) int` casts `total` to `int` twice. On a 32-bit platform (unlikely in production but valid Go) this silently truncates values above ~2 billion. The same cast exists in the `clampPage` helper. The existing pattern in other services uses `int64` arithmetic throughout.

**Recommendation:** Compute the last page without narrowing: `lp := (total + int64(perPage) - 1) / int64(perPage)` and return `int(lp)`.

---

### CR-004 (warning): No validation that the chosen warehouse belongs to the same branch

**File:** `convision-api-golang/internal/branch/service.go`  
**Line:** 123–125

`Update` sets `b.DefaultWarehouseID = input.DefaultWarehouseID` without verifying that the supplied warehouse ID actually belongs to this branch. An admin could accidentally (or maliciously) assign a warehouse from another branch as the default, causing `deductStock` to silently deduct stock from a warehouse the branch does not own.

**Recommendation:** Before persisting, call `warehouseRepo.GetByID` and assert `w.BranchID == b.ID`. Because the branch service currently has no warehouse repo dependency, the simplest fix is to add a cross-branch validation at the handler or service level, or inject `WarehouseRepository` into the branch service. At minimum, add a comment documenting the known gap.

---

### CR-005 (warning): `ctx context.Context` parameter accepted but never used

**File:** `convision-api-golang/internal/sale/service.go`  
**Lines:** 458, 573

Both `deductStock(ctx context.Context, ...)` and `revertStock(ctx context.Context, ...)` accept a `context.Context` but never pass it to any downstream call (GORM transactions use `s.db.Transaction`, not `s.db.WithContext(ctx).Transaction`). This is dead API surface and would fail a `staticcheck` or `golangci-lint` pass with `context.Background()` being obviously pointless.

**Recommendation:** Either wire `ctx` into GORM via `db.WithContext(ctx).Transaction(...)`, or remove the parameter and call sites at lines 284 and 428. The former is the better long-term choice as it enables request cancellation propagation.

---

### CR-006 (warning): `BranchFormFields` fetches all warehouses unconditionally — no loading/error state shown

**File:** `convision-front/src/pages/admin/branches/BranchFormFields.tsx`  
**Line:** 29–34

The `useEffect` fires once on mount and silently swallows the error (`catch(() => setWarehouses([]))`). If the fetch is slow, the warehouse `<Select>` renders with an empty list and no loading indicator; the user may save the form thinking "no warehouse" is the correct value when in fact the list simply hadn't loaded yet. There is also no cleanup / abort on unmount, though because it is a one-time fetch this is low severity.

**Recommendation:** Add a `loading` state boolean, render a disabled select with a "Cargando…" placeholder while loading, and surface a visible error toast (or at minimum an error state on the FormItem) when the fetch fails.

---

### CR-007 (info): `allBranches: true` sends `branch_id=0` which relies on backend convention

**File:** `convision-front/src/services/inventoryService.ts`  
**Line:** 215  
Related: `convision-api-golang/internal/transport/http/v1/handler_inventory.go` line 23–31

The frontend encodes "no branch filter" as `branch_id=0`; the handler treats `*override == 0` as "omit the filter". This is an implicit protocol—`0` is not a documented sentinel in the API contract and any future numeric parse change could silently break it. The `BranchFormFields` component passes `allBranches: true`, which triggers this path correctly today but the coupling is fragile.

**Recommendation:** Document this convention in the handler comment or use an explicit query param like `all_branches=true` on the API side to make the intent unambiguous.

---

### CR-008 (info): `StockMovement` has no `BranchID` column — cross-tenant Kardex leakage risk

**File:** `convision-api-golang/internal/domain/inventory.go`  
**Lines:** 183–203

`StockMovement` does not have a `BranchID` (or `clinic_id`/schema-scoped) field. The repository queries (`FindBySaleAndProduct`, `List`) do not filter by branch. Because the project uses PostgreSQL schema-per-tenant isolation (`tenantDBFromCtx`), this is safe today as long as `deductStock`/`revertStock` are only ever called with the tenant-scoped `s.db`. However, `s.db` in the sale service is the root DB injected in `main.go` (line 197), not a per-request tenant DB — meaning the Kardex is written to and queried from the public schema or the schema that was active at service instantiation time. This should be validated; if `s.db` is not schema-scoped, all tenants share the same Kardex rows with no isolation.

**Recommendation:** Audit whether `s.db` in the sale service is tenant-scoped. If not, thread the tenant-scoped DB (from `tenantDBFromCtx`) down through `deductStock`/`revertStock`, or add `BranchID` to `StockMovement` and include it in all queries.

---

### CR-009 (info): Migration `.down.sql` uses `DROP COLUMN IF EXISTS` without `ON DELETE` cleanup note

**File:** `convision-api-golang/db/migrations/platform/000038_add_default_warehouse_to_branches.down.sql`  
**Line:** 1

The down migration simply drops the column. This is correct and idempotent. However, the `.up.sql` adds a foreign key `REFERENCES warehouses(id) ON DELETE SET NULL`, which means the FK constraint will be implicitly dropped with the column. The down migration is safe as written, but it would be good practice to name the FK constraint in the up migration (`CONSTRAINT fk_branches_default_warehouse FOREIGN KEY ...`) so it can be dropped explicitly and the intent is clear in both directions.

**Recommendation:** In the up migration, use an explicit constraint name. This is a minor style issue and does not affect correctness.
