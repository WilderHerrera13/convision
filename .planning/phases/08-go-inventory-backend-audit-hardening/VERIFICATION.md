# Phase 8 Verification Checklist

Checklist for confirming all bugs fixed in Plans 08-02 and 08-03 are correctly implemented.

---

## 1. Code-Level Checks (grep)

Run each command from the repo root. Each must return at least one match unless noted otherwise.

### Plan 08-02 — Transfer Business Logic

```bash
# Service struct has db *gorm.DB field
grep "db \*gorm.DB" convision-api-golang/internal/inventory/service.go

# NewService first parameter is db *gorm.DB
grep "func NewService(db \*gorm.DB" convision-api-golang/internal/inventory/service.go

# CompleteTransfer uses a transaction
grep "s.db.Transaction" convision-api-golang/internal/inventory/service.go

# CompleteTransfer uses SELECT FOR UPDATE row-level locks
grep "clause.Locking" convision-api-golang/internal/inventory/service.go

# CompleteTransfer rejects non-pending status
grep "solo se pueden completar transferencias en estado pendiente" convision-api-golang/internal/inventory/service.go

# CancelTransfer exists
grep "func (s \*Service) CancelTransfer" convision-api-golang/internal/inventory/service.go

# CancelTransfer rejects non-pending status
grep "solo se pueden cancelar transferencias en estado pendiente" convision-api-golang/internal/inventory/service.go

# CreateTransfer rejects same source and destination
grep "la ubicación de origen y destino no pueden ser la misma" convision-api-golang/internal/inventory/service.go

# CreateTransfer rejects insufficient stock
grep "stock insuficiente en la ubicación de origen" convision-api-golang/internal/inventory/service.go

# TransferCreateInput requires quantity >= 1
grep "min=1" convision-api-golang/internal/inventory/service.go

# UpdateTransfer uses state machine
grep "allowedTransitions" convision-api-golang/internal/inventory/service.go

# UpdateTransfer rejects terminal-state modifications
grep "no se puede modificar una transferencia en estado terminal" convision-api-golang/internal/inventory/service.go

# UpdateTransfer delegates to CompleteTransfer
grep "return s.CompleteTransfer(id)" convision-api-golang/internal/inventory/service.go

# UpdateTransfer delegates to CancelTransfer
grep "return s.CancelTransfer(id)" convision-api-golang/internal/inventory/service.go

# Repository Update is restricted to mutable fields only (should NOT match source/destination)
# Expected: 0 matches inside the Update function for immutable fields
grep "source_location_id" convision-api-golang/internal/platform/storage/postgres/inventory_transfer_repository.go | grep -v List | grep -v Create | grep -v filter
# Expected: returns "completed_at" match inside Update map
grep "completed_at" convision-api-golang/internal/platform/storage/postgres/inventory_transfer_repository.go

# POST /complete and /cancel routes exist
grep "/:id/complete" convision-api-golang/internal/transport/http/v1/routes.go
grep "/:id/cancel" convision-api-golang/internal/transport/http/v1/routes.go
grep "h.CompleteInventoryTransfer" convision-api-golang/internal/transport/http/v1/routes.go
grep "h.CancelInventoryTransfer" convision-api-golang/internal/transport/http/v1/routes.go

# Handler methods exist
grep "func (h \*Handler) CompleteInventoryTransfer" convision-api-golang/internal/transport/http/v1/handler_inventory.go
grep "func (h \*Handler) CancelInventoryTransfer" convision-api-golang/internal/transport/http/v1/handler_inventory.go
```

### Plan 08-03 — Inventory Item & Warehouse Guards

```bash
# LensID renamed to ProductID in domain
grep "ProductID uint" convision-api-golang/internal/domain/inventory.go
# Expected: 0 matches
grep "LensID" convision-api-golang/internal/domain/inventory.go

# AdjustStock rewritten to AdjustStockByItemID
grep "func (s \*Service) AdjustStockByItemID" convision-api-golang/internal/inventory/service.go
# Expected: 0 matches (old function removed)
grep "func (s \*Service) AdjustStock\b" convision-api-golang/internal/inventory/service.go

# Status enum validation helpers exist
grep "func validateItemStatus" convision-api-golang/internal/inventory/service.go
grep "func validateTransferStatus" convision-api-golang/internal/inventory/service.go

# ItemUpdateInput uses pointer for Quantity to avoid zero-value overwrite
grep "Quantity \*int" convision-api-golang/internal/inventory/service.go

# DeleteLocation has inventory guard
grep "DeleteLocation" convision-api-golang/internal/inventory/service.go

# warehouse_location_id filter in ListInventoryItems handler
grep "warehouse_location_id" convision-api-golang/internal/transport/http/v1/handler_inventory.go

# AdjustInventory handler uses inventory_item_id + delta
grep "inventory_item_id\|InventoryItemID" convision-api-golang/internal/transport/http/v1/handler_inventory.go

# GetTotalStock returns unified shape with total_units
grep "total_units" convision-api-golang/internal/transport/http/v1/handler_inventory.go

# DB migration 000016 exists
ls convision-api-golang/db/migrations/tenant/000016_rename_lens_id_to_product_id.up.sql
ls convision-api-golang/db/migrations/tenant/000016_rename_lens_id_to_product_id.down.sql

# Migration renames lens_id to product_id
grep "RENAME COLUMN lens_id TO product_id" convision-api-golang/db/migrations/tenant/000016_rename_lens_id_to_product_id.up.sql

# inventoryService is constructed with db as first arg in main.go
grep "inventorysvc.NewService(db," convision-api-golang/cmd/api/main.go
```

---

## 2. Build Check

```bash
cd convision-api-golang && go build ./...
```

Expected: exits 0 with no output.

---

## 3. Integration Script

Requires the backend running on port 8001 with seed data (at least one product in the catalog).

```bash
# With auto-login (recommended):
BASE_URL=http://localhost:8001 bash convision-api-golang/scripts/verify-inventory.sh

# Or with explicit JWT token:
TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@convision.com","password":"password"}' \
  | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//') && \
BASE_URL=http://localhost:8001 TOKEN=$TOKEN bash convision-api-golang/scripts/verify-inventory.sh
```

Expected output: `X/N tests passed` where X == N, exit code 0.

The script covers:
- Section 1: Warehouse CRUD (4 assertions)
- Section 2: Location CRUD (3 assertions)
- Section 3: Item CRUD + guards: duplicate rejection, delete-with-stock rejection, AdjustStockByItemID, negative delta rejection (7 assertions)
- Section 4: Transfer validation guards: same location, zero quantity, insufficient stock (3 assertions)
- Section 5: Transfer happy path: create pending → complete → verify quantity moved at source and destination (6 assertions)
- Section 6: State machine guards: re-complete rejected, cancel, re-cancel rejected (5 assertions)
- Section 7: TotalStock unified shape with and without warehouse_id filter (4 assertions)
- Section 8: Location delete guard with active inventory (1 assertion)
- Section 9: Warehouse delete guard (1 assertion)

---

## 4. DB Verification Queries

Run these in psql after executing the integration script or a manual test transfer to confirm stock was correctly moved.

```sql
-- Replace :source_item_id and :dest_item_id with actual IDs from the test run.

-- Check source item quantity decreased
SELECT id, product_id, warehouse_location_id, quantity, status, updated_at
FROM inventory_items
WHERE id = :source_item_id;

-- Check destination item quantity increased
SELECT id, product_id, warehouse_location_id, quantity, status, updated_at
FROM inventory_items
WHERE id = :dest_item_id;

-- Check transfer record has completed_at set and status = completed
SELECT id, product_id, source_location_id, destination_location_id,
       quantity, status, completed_at, created_at
FROM inventory_transfers
WHERE id = :transfer_id;

-- Confirm no orphaned inventory_items referencing deleted locations
SELECT ii.id, ii.warehouse_location_id
FROM inventory_items ii
LEFT JOIN warehouse_locations wl ON wl.id = ii.warehouse_location_id AND wl.deleted_at IS NULL
WHERE wl.id IS NULL AND ii.deleted_at IS NULL;
-- Expected: 0 rows

-- Verify total stock per product matches sum of individual items
SELECT product_id, SUM(quantity) AS total
FROM inventory_items
WHERE deleted_at IS NULL
GROUP BY product_id
ORDER BY product_id;
```

---

## 5. Concurrency Test (manual)

Requires `ab` (Apache Bench) or `k6`. Tests that two concurrent transfers cannot both succeed when only enough stock for one exists.

### Setup

```bash
# Create an item with exactly 5 units
# Item ID saved as $ITEM_ID, location IDs as $LOC_A and $LOC_B

# Create 10 pending transfers each requesting 5 units (only 1 can succeed):
for i in $(seq 1 10); do
  curl -s -X POST "$BASE_URL/api/v1/inventory-transfers" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"source_location_id\":$LOC_A,\"destination_location_id\":$LOC_B,\"quantity\":5,\"product_id\":$PROD_ID}" \
    | grep -o '"id":[0-9]*' | head -1
done
# Save transfer IDs
```

### Concurrent complete requests

```bash
# Using ab (10 concurrent requests against the complete endpoint for the first transfer)
# Expected: exactly 1 succeeds (HTTP 200), 9 get HTTP 422 (already completed or insufficient stock)

# Using a simple parallel bash loop:
for TRF_ID in $TRF_ID_1 $TRF_ID_2 ...; do
  curl -s -o /dev/null -w "$TRF_ID: %{http_code}\n" \
    -X POST "$BASE_URL/api/v1/inventory-transfers/$TRF_ID/complete" \
    -H "Authorization: Bearer $TOKEN" &
done
wait
```

### Expected result

```sql
-- After all concurrent completes, source item quantity must be >= 0 (never negative)
SELECT quantity FROM inventory_items WHERE id = :source_item_id;
-- Expected: 0 (one transfer of 5 from 5) or original value (all rejected)
```

---

## Phase 8 Sign-Off Criteria

- [ ] All grep checks in Section 1 pass (returns expected matches)
- [ ] `go build ./...` exits 0
- [ ] `verify-inventory.sh` runs all tests with 0 failures
- [ ] DB queries show correct post-transfer quantities (source decreased, destination increased)
- [ ] `completed_at` is non-null on completed transfers
- [ ] Concurrency test shows no negative stock or double-deduction
