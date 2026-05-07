---
phase: 17
status: warning
depth: standard
files_reviewed: 8
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
reviewed_at: 2026-05-06
---

## Code Review — Phase 17: bulk-inventory-upload-kardex-integration

**Files reviewed:**
- `convision-api-golang/internal/bulkimport/importer_inventory.go`
- `convision-api-golang/internal/bulkimport/service.go`
- `convision-api-golang/internal/transport/http/v1/handler_bulk_import.go`
- `convision-api-golang/internal/transport/http/v1/routes.go`
- `convision-api-golang/cmd/api/main.go`
- `convision-front/src/pages/admin/bulk-import/BulkImportPage.tsx`
- `convision-front/src/pages/admin/bulk-import/ImportTypeSelectPage.tsx`
- `convision-front/src/services/bulkImportService.ts`

---

### WR-01: Silent DB error swallowed in resolve-or-create helpers

**File:** `convision-api-golang/internal/bulkimport/importer_inventory.go`
**Lines:** `resolveOrCreateProduct` (~L123), `resolveOrCreateWarehouse` (~L157)
**Severity:** warning

Both helpers check `if err == nil && len(existing) > 0` — meaning when `List` returns an error (e.g., connection timeout, query failure), the code silently proceeds to create a new entity. Under normal conditions this is fine, but under transient DB pressure a timeout from `List` could be followed by a successful `Create`, masking the original error and potentially leaving the caller to believe a fresh entity was created rather than detecting the DB issue.

**Recommended fix:**

```go
// resolveOrCreateProduct
existing, _, err := i.productRepo.List(db, ...)
if err != nil {
    return nil, false, fmt.Errorf("buscar producto %q: %w", internalCode, err)
}
if len(existing) > 0 {
    return existing[0], false, nil
}
// ... proceed to create

// resolveOrCreateWarehouse
warehouses, _, err := i.warehouseRepo.List(db, ...)
if err != nil {
    return nil, fmt.Errorf("buscar bodega para sede %d: %w", branchID, err)
}
if len(warehouses) > 0 {
    return warehouses[0], nil
}
// ... proceed to create
```

The fail-closed pattern also makes error logs more actionable — the row will show `RecordStatusError` with a clear DB error reason rather than quietly creating a duplicate.

---

### IN-01: Large float → int truncation for quantity and branchID

**File:** `convision-api-golang/internal/bulkimport/importer_inventory.go`
**Lines:** `quantity := int(quantityFloat)` (~L63), `branchID := uint(sedeFloat)` (~L71)
**Severity:** info

`strconv.ParseFloat` accepts values up to `1.8e308`. Converting a float like `1e18` to `int` (or `uint`) overflows silently on most platforms. In practice, inventory quantities and branch IDs will never be this large, but the conversion is unchecked.

**Optional guard:**

```go
if quantityFloat > float64(math.MaxInt32) {
    rec.Status = RecordStatusError
    rec.Reason = "campo Cant fuera de rango"
    return rec
}
quantity := int(quantityFloat)
```

Low priority — functional risk is negligible. Worth adding if this code handles untrusted files.

---

## Summary

- **WR-01** is the only actionable finding. It's a defensive coding improvement rather than an active bug — the existing logic works correctly under normal conditions.
- **IN-01** is informational only; no fix needed for production inventory data.
- All GORM calls use parameterized queries — no SQL injection risk.
- Admin-only RBAC on the endpoint is correctly wired via `RequireRole(domain.RoleAdmin)`.
- Frontend TypeScript types are correctly extended and the build passes clean.
- The `updated` badge correctly distinguishes stock additions from new-record creation.
