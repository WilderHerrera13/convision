---
phase: "18"
status: human_needed
must_haves_verified: 27/27
---

# Verification Results

## Must-Haves by Plan

### Plan 18-01: Migration + Branch domain/service/handler

| Must-Have | Status |
|---|---|
| `000038_add_default_warehouse_to_branches.up.sql` exists with `ALTER TABLE branches ADD COLUMN IF NOT EXISTS default_warehouse_id INTEGER REFERENCES warehouses` | verified |
| `000038_add_default_warehouse_to_branches.down.sql` exists with `DROP COLUMN IF EXISTS default_warehouse_id` | verified |
| `domain.Branch` struct has `DefaultWarehouseID *uint` with `gorm:"column:default_warehouse_id"` | verified |
| `branch.UpdateInput` has `DefaultWarehouseID *uint \`json:"default_warehouse_id"\`` | verified |
| `branch.Service.Update` applies `DefaultWarehouseID` when pointer is non-nil (`b.DefaultWarehouseID = input.DefaultWarehouseID`) | verified |
| `BranchResource` has `DefaultWarehouseID *uint \`json:"default_warehouse_id"\`` | verified |
| `branchToResource` helper exists and is called in all four handler functions (count=5: 1 def + 4 call sites) | verified |

### Plan 18-02: Sale service deductStock/revertStock wiring

| Must-Have | Status |
|---|---|
| `StockMovementRepository` interface has `FindBySaleAndProduct(db *gorm.DB, saleID, productID uint) (*StockMovement, error)` | verified |
| Postgres impl of `FindBySaleAndProduct` queries `movement_type=exit`, `reference_type=sale`, returns `ErrNotFound` on miss | verified |
| `sale.Service` struct has `branchRepo domain.BranchRepository`, `itemRepo domain.InventoryItemRepository`, `movementRepo domain.StockMovementRepository` | verified |
| `salesvc.NewService` has 3 new params: `branchRepo`, `itemRepo`, `movementRepo` between `appointmentRepo` and `logger` | verified |
| `deductStock` loads branch via `branchRepo.GetByID`, guards `branch.DefaultWarehouseID != nil`, filters by `warehouse_id` (Modelo A) | verified |
| `revertStock` looks up original exit movement via `FindBySaleAndProduct` and writes `MovementTypeAdjustmentAdd` | verified |
| `Create()` calls `s.deductStock(context.Background(), ...)` after `saleRepo.Create` log line and before `createLabOrderIfNeeded` | verified |
| `Cancel()` calls `s.revertStock(context.Background(), ...)` before setting `sale.Status = domain.SaleStatusCancelled` | verified |
| All failure paths in both helpers use `s.logger.Warn(...)` and `continue`/`return` without error propagation (best-effort) | verified |
| `cmd/api/main.go` passes `branchRepo, inventoryItemRepo, stockMovementRepo` to `salesvc.NewService` | verified |

### Plan 18-03: Frontend branch edit form

| Must-Have | Status |
|---|---|
| `Branch` interface in `branchService.ts` has `default_warehouse_id?: number \| null` | verified |
| `BranchPayload` in `branchService.ts` has `default_warehouse_id?: number \| null` (total 2 occurrences in file) | verified |
| `branchFormSchema` in `branchSchemas.ts` adds `default_warehouse_id: z.number().nullable().optional()` | verified |
| `emptyBranchFormValues` sets `default_warehouse_id: null` | verified |
| `branchToFormValues` maps `branch.default_warehouse_id ?? null` | verified |
| `branchFormToPayload` includes `default_warehouse_id: values.default_warehouse_id ?? null` | verified |
| `BranchFormFields.tsx` loads warehouses via `inventoryService.getWarehouses({ perPage:100, status:'active', allBranches:true })` | verified |
| `BranchFormFields.tsx` renders `SelectItem value="none"` ("Sin almacén predeterminado") that maps to null | verified |
| `BranchFormFields.tsx` renders one `SelectItem` per warehouse | verified |

### Plan 18-04: Build verification

| Must-Have | Status |
|---|---|
| `make build` exits 0 (Go backend compiles, binary at `bin/convision-api`) | verified |

## Critical CR Fixes

| Fix | Status |
|---|---|
| `branch_repository.go` Update map includes `"default_warehouse_id": b.DefaultWarehouseID` (line 121) | verified |
| `sale/service.go` Cancel has idempotency guard: `if sale.Status == domain.SaleStatusCancelled { return sale, nil }` (lines 427-428) | verified |

## Additional Structural Checks

| Check | Status |
|---|---|
| Old highest-quantity warehouse loop (`for _, inv := range invItems[1:]`) is NOT present in `sale/service.go` | verified |
| Exactly 2 `s.db.Transaction` calls in `sale/service.go` (one in `deductStock`, one in `revertStock`) | verified |
| `deductStock` writes `domain.MovementTypeExit` | verified |
| `revertStock` writes `domain.MovementTypeAdjustmentAdd` with note `"stock reversal due to sale cancellation"` | verified |

---

## Human Verification Required

The following flows require a running backend with a live database to verify end-to-end. All structural/code checks above passed; these tests cannot be performed statically.

### HV-01: Branch default warehouse assignment (SALE-STOCK-01)

1. Log in as admin (`admin@convision.com` / `password`).
2. Open the branch edit form for any branch.
3. Confirm the "Almacén predeterminado" `Select` dropdown appears and is populated with active warehouses.
4. Select a warehouse and save.
5. Call `GET /api/v1/branches/:id` — confirm `default_warehouse_id` is returned with the selected warehouse's ID.
6. Call `PUT /api/v1/branches/:id` with `{"default_warehouse_id": null}` — confirm the field is nulled out.

### HV-02: Stock deduction on sale creation (SALE-STOCK-02)

1. Ensure a branch has a `default_warehouse_id` set to a warehouse that has at least one inventory item (product with `tracks_stock=true`, quantity > 0).
2. Note the current `quantity` in the inventory item for that product + warehouse.
3. Create a sale via `POST /api/v1/sales` including that product.
4. Confirm the `quantity` in the inventory item has decreased by the sold quantity (or by available stock if sold > available).
5. Check the kardex (`GET /api/v1/inventory/movements`) — confirm an `exit` `StockMovement` exists with `reference_type=sale` and `reference_id=<sale_id>`.

### HV-03: Stock deduction is best-effort — sale never blocked (SALE-STOCK-04)

1. Set a branch's `default_warehouse_id` to null (no default warehouse).
2. Create a sale for that branch — confirm the sale is created successfully despite no warehouse being configured (check backend logs for `Warn` message).
3. Create a sale for a branch whose default warehouse has zero stock for a sold product — confirm the sale succeeds and a warning is logged.
4. Create a sale for a product that does NOT have an inventory item in the default warehouse — confirm the sale succeeds.

### HV-04: Stock reversal on sale cancellation (SALE-STOCK-03)

1. Using the sale created in HV-02, note the current inventory quantity.
2. Cancel the sale via `PUT /api/v1/sales/:id/cancel`.
3. Confirm the `quantity` has been restored (increased by the amount originally deducted).
4. Check the kardex — confirm an `adjustment_add` `StockMovement` exists with `reference_type=sale`, `reference_id=<sale_id>`, and `notes="stock reversal due to sale cancellation"`.

### HV-05: Cancel idempotency guard

1. Cancel a sale (call `PUT /api/v1/sales/:id/cancel`).
2. Cancel the same sale again.
3. Confirm the second call returns the already-cancelled sale without error and without creating a duplicate `adjustment_add` movement in the kardex.
