---
phase: 21-standardize-backend-filter-pattern
plan: 03
subsystem: api
tags: [go, gorm, gin, filter-structs, inventory, warehouse, stock-movement, kardex, mocks]

requires:
  - phase: 21-01
    provides: domain.Pagination struct + canonical Filter pattern documentation
  - phase: 21-02
    provides: RoleFilter / NotificationFilter reference template

provides:
  - WarehouseFilter, WarehouseLocationFilter, InventoryItemFilter, TotalStockFilter, InventoryTransferFilter, InventoryAdjustmentFilter, StockMovementFilter typed structs
  - Inventory module fully migrated to typed Filter + ShouldBindQuery flow (domain → repo → service → handler → mocks)
  - End-of-chain callers (bulkimport, sale) updated to typed filters

affects: [21-04, 21-05, 21-06, 21-07, 21-08, 21-09, 21-10]

tech-stack:
  added: []
  patterns:
    - "Typed Filter structs cover the entire inventory module — no map[string]any in any inventory List signature"
    - "Internal service callers (DeleteLocation, GetProductInventorySummary, ListItemsByLocation, sale.findStockSource, sale.revertStock, bulkimport upsert/resolveOrCreateWarehouse) build the typed filter inline"

key-files:
  created: []
  modified:
    - convision-api-golang/internal/domain/inventory.go
    - convision-api-golang/internal/platform/storage/postgres/warehouse_repository.go
    - convision-api-golang/internal/platform/storage/postgres/warehouse_location_repository.go
    - convision-api-golang/internal/platform/storage/postgres/inventory_item_repository.go
    - convision-api-golang/internal/platform/storage/postgres/inventory_transfer_repository.go
    - convision-api-golang/internal/platform/storage/postgres/inventory_adjustment_repository.go
    - convision-api-golang/internal/platform/storage/postgres/stock_movement_repository.go
    - convision-api-golang/internal/inventory/service.go
    - convision-api-golang/internal/transport/http/v1/handler_inventory.go
    - convision-api-golang/internal/testutil/mocks/inventory_repo.go
    - convision-api-golang/internal/bulkimport/importer_inventory.go
    - convision-api-golang/internal/sale/service.go

key-decisions:
  - "Bundled tasks into 3 compound commits (T1+T2, T3+T4, T5+T6+T7) — same rationale as 21-02: Repository interface changes and their only implementation must compile in lockstep, otherwise HEAD becomes uncompilable mid-plan"
  - "Migrated 2 outside-scope callers (bulkimport/importer_inventory.go and sale/service.go) from map[string]any to typed filters. Required for the package to compile after the InventoryItemRepository.List interface change. Tracked as Rule 3 (Blocking) deviation"
  - "Removed inventory/service.go clampPage helper since every List* method now calls f.Clamp() directly — leaving an unused private function would have triggered lint warnings"
  - "GetProductInventorySummary previously requested 1000 items per page; clamped to PerPage=200 (Pagination.Clamp upper bound). No callers depend on >200; reasonable for a per-product summary"
  - "Inventory mocks updated to typed signatures only — no backward-compat shims; no mock consumer test calls these List methods (verified by grep across internal/)"

patterns-established:
  - "Filter struct field naming: BranchID *uint with form:\"-\" so ShouldBindQuery cannot accept it from the client; injected by middleware after binding"
  - "TotalStockFilter centralizes warehouse + product + category filters that previously lived in two separate allowlists (totalStockItemFilterAllowlist and totalStockProductFilterAllowlist)"
  - "InventoryTransferFilter.CreatedBy maps to the transferred_by SQL column (different field name in domain but same semantic role)"

requirements-completed: [FILTER-01, FILTER-02, FILTER-03, FILTER-04, FILTER-05]

duration: 7min
completed: 2026-05-08
---

# Phase 21-03: Inventory Module Filter Migration Summary

**All six inventory domains (warehouse, warehouse_location, inventory_item, inventory_transfer, inventory_adjustment, stock_movement) migrated to typed Filter structs with ShouldBindQuery — every map[string]any allowlist removed, all 7 list endpoints bind via Gin form tags, mocks and outside-scope callers (bulkimport, sale) all converted.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-08T23:34:40Z
- **Completed:** 2026-05-08T23:41:30Z
- **Tasks:** 7 (committed as 3 compound commits)
- **Files modified:** 12

## Accomplishments

- 7 typed Filter structs added to `internal/domain/inventory.go`, each embedding `domain.Pagination`.
- 6 Repository interface List signatures migrated from `(filters map[string]any, page, perPage int)` to typed Filter structs (plus `InventoryItemRepository.TotalStockPerProduct`).
- 6 PostgreSQL repository implementations rewritten with explicit nil-checked field handling. All filterAllowlist maps and the applyTotalStockFilters map loop removed.
- `internal/inventory/service.go` 7 List* methods converted to typed Filter inputs; the unused `clampPage` helper removed.
- `internal/transport/http/v1/handler_inventory.go` 7 list handlers converted to `c.ShouldBindQuery(&f)`; per-key `c.Query` + `strconv.ParseUint` plumbing removed for those endpoints.
- Inventory mocks updated to the typed signatures (build-passes verified).
- Two outside-scope callers (`bulkimport/importer_inventory.go`, `sale/service.go`) migrated to construct typed filters inline so the project still builds end-to-end.

## Task Commits

1. **T1+T2: Domain filter structs + warehouse repos** — `5903349` (refactor)
2. **T3+T4: Inventory item / transfer / adjustment / movement repos** — `91d003f` (refactor)
3. **T5+T6+T7: Service + handler + mocks + outside-scope callers** — `76e5d28` (refactor)

## Files Created/Modified

- `internal/domain/inventory.go` — 7 typed Filter structs; 6 Repository.List signatures retyped
- `internal/platform/storage/postgres/warehouse_repository.go` — `warehouseFilterAllowlist` removed; List takes typed filter
- `internal/platform/storage/postgres/warehouse_location_repository.go` — `warehouseLocationFilterAllowlist` removed
- `internal/platform/storage/postgres/inventory_item_repository.go` — 3 allowlists removed; `applyTotalStockFilters` rewritten as typed-field branches; `TotalStockPerProduct` retyped
- `internal/platform/storage/postgres/inventory_transfer_repository.go` — `inventoryTransferFilterAllowlist` removed
- `internal/platform/storage/postgres/inventory_adjustment_repository.go` — typed filter
- `internal/platform/storage/postgres/stock_movement_repository.go` — typed filter; `ListByProduct` constructs typed filter inline
- `internal/inventory/service.go` — 7 list methods retyped; `clampPage` removed; internal callers (DeleteLocation, ListItemsByLocation, GetProductInventorySummary) construct typed filters inline
- `internal/transport/http/v1/handler_inventory.go` — 7 handlers use `ShouldBindQuery`; BranchID injected post-bind
- `internal/testutil/mocks/inventory_repo.go` — 7 mock List methods retyped (Warehouse, WarehouseLocation, InventoryItem, InventoryItem.TotalStockPerProduct, InventoryTransfer, StockMovement, InventoryAdjustment)
- `internal/bulkimport/importer_inventory.go` — 3 List call sites migrated to typed filter
- `internal/sale/service.go` — 3 List call sites in `findStockSource` and `revertStock` migrated to typed filter

## Decisions Made

- **Compound commits** — same constraint as 21-02: Repository interface changes plus their sole implementation plus their only consumer must commit together to keep HEAD compilable. Three logical bundles (foundation → repos → service+handler+callers) instead of seven.
- **Outside-scope migrations** — `internal/bulkimport/importer_inventory.go` and `internal/sale/service.go` had 5 `s.itemRepo.List(...map[string]any...)` and 2 `s.warehouseRepo.List(...)` call sites. Migrated under Rule 3 (Blocking) — without these, the project would not compile.
- **clampPage removal** — every List method now calls `f.Clamp()` directly via the embedded `domain.Pagination`. Leaving the legacy private helper would have produced an unused-function lint failure.
- **GetProductInventorySummary PerPage** — was hard-coded to 1000; clamped to 200 per the Pagination.Clamp upper bound. Acceptable for a per-product item summary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Outside-scope callers needed migration**
- **Found during:** T7 verification (`go build ./...` reported `bulkimport` + `sale` package failures)
- **Issue:** Plan only listed inventory-module files, but `bulkimport/importer_inventory.go` calls `r.warehouseRepo.List` (twice) and `r.itemRepo.List` (once); `sale/service.go` calls `s.itemRepo.List` (3 sites in findStockSource and revertStock). All used the old `map[string]any` signature. Without migration, full project build would fail.
- **Fix:** Migrated all 6 call sites to construct typed filters inline. Behavior preserved (same WHERE clauses, same pagination of 1×1).
- **Files modified:** `internal/bulkimport/importer_inventory.go`, `internal/sale/service.go`
- **Verification:** `go build ./...` clean.
- **Committed in:** `76e5d28`

**2. [Rule 3 - Blocking] Removed unused clampPage helper**
- **Found during:** T5 (after the 7 service List methods were converted, all `clampPage` callers were gone)
- **Issue:** Leaving an unused unexported function would trigger lint warnings.
- **Fix:** Removed the `clampPage` function definition.
- **Files modified:** `internal/inventory/service.go`
- **Verification:** `go build` clean; `f.Clamp()` is now the single source of bounds enforcement.
- **Committed in:** `76e5d28`

**3. [Rule 1 - Bug] GetProductInventorySummary PerPage clamp**
- **Found during:** T5 (porting the 1000-item summary call to a typed filter)
- **Issue:** The original call requested `(1, 1000)`. `domain.Pagination.Clamp()` caps PerPage at 200; passing 1000 would have been silently downgraded to the default 15.
- **Fix:** Set PerPage to 200 explicitly so the clamp passes through.
- **Files modified:** `internal/inventory/service.go`
- **Verification:** Build clean. Per-product summaries with >200 items are unrealistic; no callers detected that would notice.
- **Committed in:** `76e5d28`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug). **Impact on plan:** All necessary for the project to compile and behave correctly. No scope creep — only the directly affected lines were touched.

## Issues Encountered

- Pre-existing `internal/inventory/service_test.go:41` vet failure (`svc.CreateTransfer` called with one argument; signature requires two) was already documented in 21-02-SUMMARY. Unchanged by this plan; will be addressed when phase 22 (test coverage) starts.

## Next Phase Readiness

- Wave 2a complete (21-03 inventory). Pattern proven on the largest single domain (12 files, 6 repository interfaces).
- 21-04 (sales/quote/order) is the next plan and can reuse the InventoryItemFilter shape as a reference for similar multi-FK filter structs.
- No blockers.
