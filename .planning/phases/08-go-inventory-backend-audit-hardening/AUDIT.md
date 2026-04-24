# Phase 8 Inventory Backend Audit

Gap analysis comparing Go inventory implementation against the Laravel reference (`docs/laravel-warehouse-inventory-module.md`). Each gap is classified by severity and cross-referenced to the plan task that addresses it.

---

## Summary

| Severity | Count | Plan |
|----------|-------|------|
| CRITICAL | 6     | 08-02 |
| HIGH     | 3     | 08-02, 08-03 |
| MEDIUM   | 4     | 08-03 |
| LOW      | 4     | 08-03 |

---

## Warehouse

### Domain Model

No gaps. Go `Warehouse` struct fields (`Name`, `Code`, `Address`, `City`, `Status`, `Notes`) match Laravel fillable exactly. `Locations` association and `gorm` tags are correct.

### Service Methods

**[BUG-8a] UpdateWarehouse zero-value Address and City** — Severity: LOW
- File: `convision-api-golang/internal/inventory/service.go`
- Function: `UpdateWarehouse`
- Expected: Omitting `address` or `city` in the JSON body should leave the existing values unchanged.
- Actual: Lines `w.Address = input.Address` and `w.City = input.City` execute unconditionally, overwriting stored values with the empty string `""` when those fields are absent from the request body. `w.Notes = input.Notes` has the same problem.
- Fix: Change `WarehouseUpdateInput.Address`, `.City`, `.Notes` to `*string` pointer fields and guard with `if input.Address != nil`. Plan 08-03-T2.

### Repository Methods

No gaps. `WarehouseRepository` interface covers `GetByID`, `Create`, `Update`, `Delete`, `List`, `ListLocations`. `DeleteWarehouse` correctly delegates to the repo after an existence check; the service also verifies there are no inventory items before deleting (L151-166 of service.go). Filter allowlist supports `status` filter — matches Laravel `ApiFilterable` trait usage.

### HTTP Handlers & Routes

No gaps. All 6 Laravel warehouse routes are present:
- `GET /warehouses` — `ListWarehouses`
- `GET /warehouses/:id` — `GetWarehouse`
- `GET /warehouses/:id/locations` — `GetWarehouseLocations`
- `POST /warehouses` — `CreateWarehouse` (admin only)
- `PUT /warehouses/:id` — `UpdateWarehouse` (admin only)
- `DELETE /warehouses/:id` — `DeleteWarehouse` (admin only)

---

## WarehouseLocation

### Domain Model

No gaps. Go `WarehouseLocation` struct fields (`WarehouseID`, `Name`, `Code`, `Type`, `Status`, `Description`) match Laravel fillable. `Warehouse` association is eager-loaded correctly.

Note: Laravel migration has a `UNIQUE (warehouse_id, name)` index. Go domain struct has no `uniqueIndex` on this combination — this is a DB schema gap (not a Go code bug) to address in a migration. Severity: MEDIUM.

**[BUG-14] Missing unique constraint on (warehouse_id, name)** — Severity: MEDIUM
- File: `convision-api-golang/internal/domain/inventory.go` / DB migration
- Function: N/A (schema gap)
- Expected: Laravel migration defines `UNIQUE (warehouse_id, name)` on `warehouse_locations`.
- Actual: Go `WarehouseLocation` struct has `gorm:"index"` on `Code` only. The compound unique constraint `(warehouse_id, name)` is absent from the Go schema definition.
- Fix: Add the unique constraint in a new SQL migration and add `gorm:"uniqueIndex:uq_location_name_warehouse"` to the GORM struct for local AutoMigrate. Plan 08-03-T2.

### Service Methods

**[BUG-4] DeleteLocation missing inventory guard** — Severity: HIGH
- File: `convision-api-golang/internal/inventory/service.go`
- Function: `DeleteLocation`
- Expected: Deleting a warehouse location that has active `InventoryItem` rows should be rejected (HTTP 422), matching the behavior of `DeleteWarehouse` which performs this check at L151-166.
- Actual: `DeleteLocation` (lines 256-261) calls `s.locationRepo.GetByID(id)` (existence check only) and immediately calls `s.locationRepo.Delete(id)`. No query against `inventory_items` is performed. Locations with active stock can be silently deleted, corrupting all inventory records that reference `warehouse_location_id`.
- Fix: Before deletion, call `s.itemRepo.List(map[string]any{"warehouse_location_id": id}, 1, 1)` and return `domain.ErrValidation` if `len(items) > 0`. Plan 08-02-T3.

**[BUG-8b] UpdateLocation zero-value Description** — Severity: LOW
- File: `convision-api-golang/internal/inventory/service.go`
- Function: `UpdateLocation`
- Expected: Omitting `description` in the request body should leave the existing description unchanged.
- Actual: Line `l.Description = input.Description` executes unconditionally, overwriting with `""` when the field is absent.
- Fix: Change `LocationUpdateInput.Description` to `*string` and guard with `if input.Description != nil`. Plan 08-03-T2.

### Repository Methods

No gaps in method coverage. `WarehouseLocationRepository` interface has `GetByID`, `Create`, `Update`, `Delete`, `List`. Filter allowlist (`warehouse_id`, `status`, `type`) covers all Laravel filterable fields.

### HTTP Handlers & Routes

**[BUG-11a] Missing GET /warehouse-locations/:id/inventory route** — Severity: LOW
- File: `convision-api-golang/internal/transport/http/v1/routes.go`
- Function: N/A (missing route)
- Expected: Laravel defines `GET /warehouse-locations/{location}/inventory` returning paginated `InventoryItem` list for a location (`WarehouseLocationController@inventoryItems`).
- Actual: This route is absent from Go routes.go. The `ListWarehouseLocations` group (lines 315-322) only registers CRUD endpoints.
- Fix: Add `warehouseLocations.GET("/:id/inventory", h.ListLocationInventoryItems)` in routes.go and implement `ListLocationInventoryItems` handler using `h.inventory.ListItems` with `warehouse_location_id` filter. Plan 08-03-T3.

---

## InventoryItem

### Domain Model

No gaps in field definitions. `ProductID`, `WarehouseID`, `WarehouseLocationID *uint`, `Quantity int`, `Status InventoryItemStatus`, `Notes` match Laravel fillable. All 6 `InventoryItemStatus` constants are present: `available`, `reserved`, `damaged`, `sold`, `returned`, `lost`.

Note: Laravel migration only includes 3 values in the `ENUM` CHECK; the Go domain correctly defines all 6. This is an intentional improvement.

### Service Methods

**[BUG-7] Status enum not validated in CreateItem and UpdateItem** — Severity: MEDIUM
- File: `convision-api-golang/internal/inventory/service.go`
- Function: `CreateItem`, `UpdateItem`
- Expected: An invalid status like `"spoiled"` should return HTTP 422 with a meaningful error message.
- Actual: `CreateItem` (L319): `status := domain.InventoryItemStatus(input.Status)` performs a raw cast with no allowlist check. `UpdateItem` (L351): `i.Status = domain.InventoryItemStatus(input.Status)` — same pattern. An invalid status passes through Go and hits the PostgreSQL `CHECK` constraint, returning a confusing 500.
- Fix: Add a `validateItemStatus(s string) (domain.InventoryItemStatus, error)` helper that checks against a `map[domain.InventoryItemStatus]bool` allowlist. Call it in both `CreateItem` and `UpdateItem`. Plan 08-03-T1.

**[BUG-8c] UpdateItem zero-value Quantity** — Severity: MEDIUM
- File: `convision-api-golang/internal/inventory/service.go`
- Function: `UpdateItem`; Struct: `ItemUpdateInput`
- Expected: A `PUT /inventory-items/:id` request with body `{"status":"reserved"}` (no `quantity` field) should leave the existing quantity unchanged.
- Actual: `ItemUpdateInput.Quantity` is `int` (not `*int`). When the field is absent in JSON, Go deserializes it as `0`. Line 349 `i.Quantity = input.Quantity` unconditionally sets quantity to `0`, silently zeroing out stock on any partial update.
- Fix: Change `ItemUpdateInput.Quantity` to `*int`. Guard with `if input.Quantity != nil { i.Quantity = *input.Quantity }`. Also change `Notes` to `*string` for the same reason. Plan 08-03-T1.

**[BUG-7b] Missing business validations in CreateItem** — Severity: MEDIUM
- File: `convision-api-golang/internal/inventory/service.go`
- Function: `CreateItem`
- Expected: Laravel's `StoreInventoryItemRequest` validates (a) `warehouse_location_id` belongs to the given `warehouse_id`, and (b) no existing `InventoryItem` with the same `(product_id, warehouse_location_id)` pair.
- Actual: `CreateItem` in Go (lines 318-335) performs neither check. It directly creates the record, relying on DB-level constraints (if they exist) to reject duplicates, and does not validate location-warehouse consistency.
- Fix: Add `validateLocationBelongsToWarehouse(locationID, warehouseID uint) error` and `checkDuplicateInventoryItem(productID uint, locationID *uint) error` to the service. Call both before `s.itemRepo.Create`. Plan 08-03-T1.

### Repository Methods

No gaps in method coverage. `inventoryItemFilterAllowlist` contains `product_id`, `warehouse_id`, `warehouse_location_id`, `status` — matches Laravel filters exactly.

### HTTP Handlers & Routes

**[BUG-11] Missing warehouse_location_id filter in ListInventoryItems** — Severity: LOW
- File: `convision-api-golang/internal/transport/http/v1/handler_inventory.go`
- Function: `ListInventoryItems`
- Expected: Laravel `InventoryItemController@index` documents `warehouse_location_id` as a supported filter. The Go repository `inventoryItemFilterAllowlist` already includes `warehouse_location_id`.
- Actual: `ListInventoryItems` (lines 179-201) only parses `product_id`, `warehouse_id`, and `status` from query params. `warehouse_location_id` is never parsed despite the repository supporting it.
- Fix: Add `if v := c.Query("warehouse_location_id"); v != "" { ... filters["warehouse_location_id"] = uint(id) }` to `ListInventoryItems`. Plan 08-03-T3.

**[BUG-10] GetTotalStock inconsistent response shape** — Severity: LOW
- File: `convision-api-golang/internal/transport/http/v1/handler_inventory.go`
- Function: `GetTotalStock`
- Expected: `GET /inventory/total-stock` should always return the same shape — a list of products with per-product totals, plus an aggregate `total_units` field.
- Actual: The current handler always returns `{"total_quantity": N}` — a scalar aggregate with no per-product breakdown. The Laravel reference returns an array of products with `total_quantity` per product (JOIN + GROUP BY). The Go implementation has no `TotalStockPerProduct` method and no per-product breakdown at all.
- Fix: Implement `TotalStockPerProduct` in the service/repository, restructure `GetTotalStock` to always return `{"data": [...], "total_units": N}`. Remove the scalar `TotalStock()` code path. Plan 08-03-T3.

**[BUG-11b] Missing GET /products/:id/inventory-summary route** — Severity: LOW
- File: `convision-api-golang/internal/transport/http/v1/routes.go`
- Function: N/A (missing route)
- Expected: Laravel defines `GET /products/{product}/inventory-summary` returning a per-location breakdown of a product's inventory.
- Actual: `GET /products/:id/stock` exists (returns `GetProductStock`) but returns a different shape than what Laravel's `productInventory` endpoint returns. No dedicated `inventory-summary` endpoint exists.
- Fix: Implement `GetProductInventorySummary` handler, wire to `GET /products/:id/inventory-summary` in routes.go. Plan 08-03-T3.

---

## InventoryTransfer

### Domain Model

**[BUG-9] LensID field should be ProductID** — Severity: MEDIUM
- File: `convision-api-golang/internal/domain/inventory.go`
- Function: `InventoryTransfer` struct (line 77)
- Expected: The `inventory_transfers` table canonical column is `product_id` (FK → `products`), NOT NULL. The Laravel DB migration defines `product_id BIGINT NOT NULL REFERENCES products(id)`.
- Actual: Go struct declares `LensID *uint json:"lens_id" gorm:"column:lens_id"` — pointing to the wrong table (`lenses`) and nullable (no business meaning for a transfer with no product).
- Fix: Rename field to `ProductID uint`, update gorm tag to `gorm:"column:product_id;not null"`, update json tag to `json:"product_id"`. Create SQL migration to `ALTER TABLE inventory_transfers RENAME COLUMN lens_id TO product_id`, drop old FK, add FK to `products`. Plan 08-03-T4.

### Service Methods

**[BUG-1] CompleteTransfer missing — stock movement never happens** — Severity: CRITICAL
- File: `convision-api-golang/internal/inventory/service.go`
- Function: `CreateTransfer`, `UpdateTransfer` (no `CompleteTransfer` exists)
- Expected: Completing a transfer (status → `completed`) must atomically decrement stock at the source location and increment stock at the destination location inside a DB transaction.
- Actual: `CreateTransfer` (lines 422-436) creates an `InventoryTransfer` record with no read or write to `inventory_items`. `UpdateTransfer` (lines 438-451) sets `t.Status` and calls `s.transferRepo.Update(t)`. No `InventoryItem` rows are ever touched during the transfer lifecycle. The entire stock movement logic is absent.
- Fix: Add `db *gorm.DB` field to `inventory.Service`. Implement `CompleteTransfer(id uint)` running inside `s.db.Transaction` with `SELECT FOR UPDATE` locking on both source and destination inventory items. Wire `UpdateTransfer` to route `status=completed` through `CompleteTransfer`. Plan 08-02-T1.

**[BUG-2] CreateTransfer — no source/destination guard, no stock check, negative quantity** — Severity: CRITICAL
- File: `convision-api-golang/internal/inventory/service.go`
- Function: `CreateTransfer`, struct `TransferCreateInput`
- Expected: (a) `source_location_id ≠ destination_location_id`. (b) Source location must have `quantity >= input.Quantity` for the product. (c) Quantity must be ≥ 1.
- Actual: (a) No same-location check anywhere. (b) No query against `inventory_items` before creating the transfer record. (c) `Quantity int binding:"required"` rejects `0` but accepts negative values like `-5`.
- Fix: Add `if input.SourceLocationID == input.DestinationLocationID { return ErrValidation }`. Add stock availability check via `s.itemRepo`. Change binding tag to `binding:"required,min=1"`. Plan 08-02-T2.

**[BUG-3] UpdateTransfer — no state machine, no completed_at stamp, terminal states unprotected** — Severity: CRITICAL
- File: `convision-api-golang/internal/inventory/service.go`
- Function: `UpdateTransfer`
- Expected: (a) Only `pending → completed` and `pending → cancelled` are valid transitions. (b) `completed_at` is set when status becomes `completed`. (c) Terminal states (`completed`, `cancelled`) cannot be further mutated.
- Actual: (a) `t.Status = domain.InventoryTransferStatus(input.Status)` accepts any string unconditionally — transitions from `completed` back to `pending` are permitted. (b) `t.CompletedAt` is never set; the column stays NULL after completion. (c) A completed transfer can be freely updated again.
- Fix: Define `allowedTransitions` map. In `UpdateTransfer`, validate transition before applying. Route `status=completed` through `CompleteTransfer`. Set `CompletedAt` inside `CompleteTransfer`. Plan 08-02-T1.

**[BUG-12] TransferCreateInput.Quantity allows negative values** — Severity: CRITICAL (sub-item of Bug #2)
- File: `convision-api-golang/internal/inventory/service.go`
- Function: struct `TransferCreateInput` (line 382)
- Expected: Quantity must be at least 1 (`binding:"required,min=1"`).
- Actual: `Quantity int json:"quantity" binding:"required"` — the `required` tag on `int` rejects only zero values; negative values like `-5` pass through.
- Fix: Change to `binding:"required,min=1"`. Plan 08-02-T2.

**[BUG-5] AdjustStock uses product_id and picks items[0] without locking** — Severity: HIGH
- File: `convision-api-golang/internal/inventory/service.go`
- Function: `AdjustStock`
- File: `convision-api-golang/internal/transport/http/v1/handler_inventory.go`
- Function: `AdjustInventory`
- Expected: Stock adjustment must target a specific `InventoryItem` by its ID (not by `product_id`) to avoid ambiguity for products with stock in multiple locations. The operation must be transactional with row-level locking.
- Actual: `AdjustStock(productID, quantity, reason)` queries `List({product_id: productID}, 1, 100)` and picks `items[0]` — whichever row `ORDER BY id DESC` returns first. For multi-location products this is non-deterministic. The `Update` call outside any transaction creates a read-then-write race condition. The handler input also uses `product_id` not `inventory_item_id`.
- Fix: Rename to `AdjustStockByItemID(itemID uint, delta int, reason string)`. Add `s.db.Transaction` with `clause.Locking{Strength:"UPDATE"}`. Change handler input to `inventory_item_id + delta`. Plan 08-02-T4.

**[BUG-6] Quantity operations lack row-level locking — race conditions possible** — Severity: HIGH
- File: `convision-api-golang/internal/inventory/service.go`
- Function: `AdjustStock`, future `CompleteTransfer`
- File: `convision-api-golang/internal/platform/storage/postgres/inventory_item_repository.go`
- Function: `Update`
- Expected: All read-then-write quantity operations must run inside a DB transaction with `SELECT FOR UPDATE` (GORM: `clause.Locking{Strength:"UPDATE"}`).
- Actual: `AdjustStock` reads `items[0].Quantity`, increments in Go memory, then calls `s.itemRepo.Update(item)` — two separate SQL statements with no transaction or lock. Two concurrent adjustments can both read the same `Quantity` value and produce an incorrect result.
- Fix: Wrap all quantity mutations in `s.db.Transaction`. Apply `clause.Locking{Strength:"UPDATE"}` to every `First` or `Where` that precedes a quantity write. Plan 08-02-T4.

### Repository Methods

**[BUG-13] InventoryTransferRepository.Update exposes immutable fields** — Severity: MEDIUM
- File: `convision-api-golang/internal/platform/storage/postgres/inventory_transfer_repository.go`
- Function: `Update`
- Expected: Once created, `source_location_id`, `destination_location_id`, and `quantity` on an `InventoryTransfer` are immutable. The `Update` method should only persist mutable fields: `notes`, `status`, `completed_at`.
- Actual: `Update` (lines 52-63) writes `lens_id`, `source_location_id`, `destination_location_id`, `quantity`, `transferred_by`, `notes`, `status`, `completed_at` — including all immutable fields. Any future caller of `transferRepo.Update` after modifying these fields would corrupt the transfer record.
- Fix: Restrict the `Update` map to `{"notes": ..., "status": ..., "completed_at": ...}` only. Plan 08-03-T4.

**[BUG-9b] Filter allowlist uses lens_id instead of product_id** — Severity: MEDIUM (part of Bug #9)
- File: `convision-api-golang/internal/platform/storage/postgres/inventory_transfer_repository.go`
- Function: `inventoryTransferFilterAllowlist` (line 13)
- Expected: Filter key must be `"product_id"` to match the canonical column name.
- Actual: `"lens_id": true` in the allowlist — filtering by `product_id` query param is silently ignored.
- Fix: Replace `"lens_id": true` with `"product_id": true` in the filter allowlist. Also update the `Update` map key from `"lens_id"` to `"product_id"`. Plan 08-03-T4.

### HTTP Handlers & Routes

**[BUG-1b] Missing POST /inventory-transfers/:id/complete route** — Severity: CRITICAL (part of Bug #1)
- File: `convision-api-golang/internal/transport/http/v1/routes.go`
- Function: N/A (missing route)
- Expected: A dedicated `POST /inventory-transfers/:id/complete` endpoint that atomically executes the stock movement.
- Actual: The `inventoryTransfers` group (lines 343-350) only has GET, POST, PUT, DELETE. No `/complete` or `/cancel` action routes exist.
- Fix: Add `inventoryTransfers.POST("/:id/complete", jwtauth.RequireRole(domain.RoleAdmin), h.CompleteInventoryTransfer)` and the corresponding `CompleteInventoryTransfer` handler. Plan 08-02-T1.

**[BUG-3b] Missing POST /inventory-transfers/:id/cancel route** — Severity: CRITICAL (part of Bug #3)
- File: `convision-api-golang/internal/transport/http/v1/routes.go`
- Function: N/A (missing route)
- Expected: A dedicated `POST /inventory-transfers/:id/cancel` endpoint that enforces the state machine (only `pending → cancelled` allowed).
- Actual: Status changes are routed through `PUT /inventory-transfers/:id` with no state machine enforcement.
- Fix: Add `inventoryTransfers.POST("/:id/cancel", jwtauth.RequireRole(domain.RoleAdmin), h.CancelInventoryTransfer)` and implement `CancelTransfer` in service. Plan 08-02-T1.

---

## Bug Index

| Bug ID | Entity | Severity | File | Function | Plan |
|--------|--------|----------|------|----------|------|
| Bug #1 | InventoryTransfer | CRITICAL | `internal/inventory/service.go` | `CreateTransfer`, `UpdateTransfer` (missing `CompleteTransfer`) | 08-02-T1 |
| Bug #1b | InventoryTransfer | CRITICAL | `internal/transport/http/v1/routes.go` | N/A — missing `/complete` route | 08-02-T1 |
| Bug #2 | InventoryTransfer | CRITICAL | `internal/inventory/service.go` | `CreateTransfer` | 08-02-T2 |
| Bug #3 | InventoryTransfer | CRITICAL | `internal/inventory/service.go` | `UpdateTransfer` | 08-02-T1 |
| Bug #3b | InventoryTransfer | CRITICAL | `internal/transport/http/v1/routes.go` | N/A — missing `/cancel` route | 08-02-T1 |
| Bug #4 | WarehouseLocation | HIGH | `internal/inventory/service.go` | `DeleteLocation` | 08-02-T3 |
| Bug #5 | InventoryItem | HIGH | `internal/inventory/service.go`, `handler_inventory.go` | `AdjustStock`, `AdjustInventory` | 08-02-T4 |
| Bug #6 | InventoryItem / Transfer | HIGH | `internal/inventory/service.go`, `inventory_item_repository.go` | All quantity mutations | 08-02-T4 |
| Bug #7 | InventoryItem | MEDIUM | `internal/inventory/service.go` | `CreateItem`, `UpdateItem` | 08-03-T1 |
| Bug #7b | InventoryItem | MEDIUM | `internal/inventory/service.go` | `CreateItem` | 08-03-T1 |
| Bug #8a | Warehouse | LOW | `internal/inventory/service.go` | `UpdateWarehouse` | 08-03-T2 |
| Bug #8b | WarehouseLocation | LOW | `internal/inventory/service.go` | `UpdateLocation` | 08-03-T2 |
| Bug #8c | InventoryItem | MEDIUM | `internal/inventory/service.go` | `UpdateItem` | 08-03-T1 |
| Bug #9 | InventoryTransfer | MEDIUM | `internal/domain/inventory.go` | `InventoryTransfer` struct | 08-03-T4 |
| Bug #9b | InventoryTransfer | MEDIUM | `internal/platform/storage/postgres/inventory_transfer_repository.go` | `inventoryTransferFilterAllowlist` | 08-03-T4 |
| Bug #10 | InventoryItem | LOW | `internal/transport/http/v1/handler_inventory.go` | `GetTotalStock` | 08-03-T3 |
| Bug #11 | InventoryItem | LOW | `internal/transport/http/v1/handler_inventory.go` | `ListInventoryItems` | 08-03-T3 |
| Bug #11a | WarehouseLocation | LOW | `internal/transport/http/v1/routes.go` | N/A — missing `/inventory` route | 08-03-T3 |
| Bug #11b | InventoryItem | LOW | `internal/transport/http/v1/routes.go` | N/A — missing `/inventory-summary` route | 08-03-T3 |
| Bug #12 | InventoryTransfer | CRITICAL | `internal/inventory/service.go` | `TransferCreateInput.Quantity` binding tag | 08-02-T2 |
| Bug #13 | InventoryTransfer | MEDIUM | `internal/platform/storage/postgres/inventory_transfer_repository.go` | `Update` | 08-03-T4 |
| Bug #14 | WarehouseLocation | MEDIUM | `internal/domain/inventory.go` / DB migration | `WarehouseLocation` struct | 08-03-T2 |

---

## Critical Path Summary

The most severe gaps (all CRITICAL) are in the `InventoryTransfer` entity:

1. **The entire transfer stock movement is absent** — completing a transfer never moves inventory between locations (Bug #1). Plan 08-02-T1 addresses this by implementing `CompleteTransfer` with `s.db.Transaction` + `SELECT FOR UPDATE`.

2. **No guards at transfer creation** — any transfer can be created for an impossible quantity, same-to-same location, or negative quantities (Bugs #2, #12). Plan 08-02-T2 adds these three checks.

3. **No state machine** — UpdateTransfer allows any status transition and never stamps `completed_at` (Bug #3). Plan 08-02-T1 fixes this as part of the CompleteTransfer implementation.

HIGH bugs are `DeleteLocation` (Bug #4, data corruption risk) and `AdjustStock` (Bugs #5, #6, ambiguity + race condition). Both in Plan 08-02.

MEDIUM and LOW bugs are cleanups: pointer fields for zero-value correctness, status enum validation, filter parity, response shape unification, LensID→ProductID rename. All addressed in Plan 08-03.
