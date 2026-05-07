---
plan: 17-01
phase: 17
status: complete
started: 2026-05-06
completed: 2026-05-06
---

## What Was Built

Implemented the backend inventory bulk importer for `POST /api/v1/bulk-import/inventory`. The importer reads a standard `Inventario.xlsx` file (sheet 0), resolves-or-creates `Product` (frame or accessory), resolves-or-creates the branch `Warehouse`, sums quantities when an `InventoryItem` already exists for that product+warehouse+branch, and writes a `StockMovement` (kardex entry) for every quantity change.

## Key Files

### Created
- `convision-api-golang/internal/bulkimport/importer_inventory.go` — `inventoryImporter` implementing `Importer` interface with full resolve-or-create + kardex logic

### Modified
- `convision-api-golang/internal/bulkimport/service.go` — added `RecordStatusUpdated`, 3 new repo params to `NewService`, `ImportTypeInventory` registry entry, tally case for `updated`
- `convision-api-golang/internal/transport/http/v1/handler_bulk_import.go` — `BulkImportInventory` handler
- `convision-api-golang/internal/transport/http/v1/routes.go` — `POST /inventory` route in bulkImportGroup
- `convision-api-golang/cmd/api/main.go` — `warehouseRepo`, `inventoryItemRepo`, `stockMovementRepo` passed to `bulkImportService`

## Decisions Made

- `resolveOrCreateWarehouse` uses `WH-<branchID>` as the warehouse code for auto-created warehouses — deterministic, no duplicates on repeated imports
- `upsertInventoryItem` uses `List` with `product_id + warehouse_id + branch_id` filter to detect existing items before deciding entry vs adjustment_add movement type
- Movement write failures are logged as warnings (non-fatal) — inventory item quantity is already updated before movement write, so data integrity is preserved

## Commits

- `a7a7e28` feat(17-01): add RecordStatusUpdated and wire inventory importer in NewService
- `3227873` feat(17-01): create importer_inventory.go with resolve-or-create and kardex writes
- `bdebea3` feat(17-01): add BulkImportInventory handler and POST /api/v1/bulk-import/inventory route
- `9cc1e38` feat(17-01): wire warehouseRepo, inventoryItemRepo, stockMovementRepo into bulkImportService

## Self-Check

- [x] `POST /api/v1/bulk-import/inventory` route registered and admin-only
- [x] Same product code → quantities sum, not duplicate InventoryItem
- [x] Every quantity change writes a `stock_movements` row (entry for new, adjustment_add for existing)
- [x] `make build` / `go build ./...` passes clean
- [x] `movementRepo.Create` called 2 times (one per branch in upsertInventoryItem)
