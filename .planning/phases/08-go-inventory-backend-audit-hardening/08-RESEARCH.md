# Phase 8 Research: Go Inventory Backend Audit & Hardening

## Executive Summary

- **Transfers are audit-only records**: completing a transfer never moves stock between locations — the entire stock-movement business logic is absent from the Go codebase.
- **No stock safety at creation**: a transfer can be created for more units than exist at the source location, with no source ≠ destination guard and no quantity sign validation.
- **State machine is an illusion**: `UpdateTransfer` accepts any status string unconditionally; `completed_at` is never stamped; terminal states (completed/cancelled) are not protected from further mutation.
- **DeleteLocation is unguarded**: deleting a warehouse location with active inventory items corrupts data silently — no inventory guard exists, unlike `DeleteWarehouse` which does have one.
- **`AdjustStock` is ambiguous and un-atomic**: it picks `items[0]` for a product that may span multiple locations and makes no use of DB transactions or row locking, making it both logically wrong and race-prone.

---

## Bug Inventory

### CRITICAL — Transfer Stock Movement (Bug #1)

**File**: `internal/inventory/service.go`  
**Functions**: `CreateTransfer` (L542–556), `UpdateTransfer` (L558–571)

**Exact issue**: `CreateTransfer` builds an `InventoryTransfer` struct and calls `s.transferRepo.Create(t)`. There is no read of `inventory_items` and no write to `inventory_items`. `UpdateTransfer` sets `t.Status = domain.InventoryTransferStatus(input.Status)` and calls `s.transferRepo.Update(t)`. Again, no inventory mutation of any kind. The DB rows in `inventory_items` are untouched for the entire transfer lifecycle.

**Exact fix**:  
Add a `db *gorm.DB` field to `inventory.Service` (injected in `NewService`). Introduce a new service method `CompleteTransfer(id uint) (*domain.InventoryTransfer, error)` that runs inside `s.db.Transaction`. The transaction must:
1. Lock the transfer row: `tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&t, id)`
2. Validate current status is `pending`
3. Lock source inventory item: `tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("product_id = ? AND warehouse_location_id = ?", t.ProductID, t.SourceLocationID).First(&src)`
4. Validate `src.Quantity >= t.Quantity`
5. Decrement source: `tx.Model(&src).Update("quantity", src.Quantity - t.Quantity)`
6. Lock destination inventory item (or create if not exists): same locking pattern, then `UPDATE quantity + t.Quantity`
7. Set `t.Status = completed`, `t.CompletedAt = &now`, `UPDATE inventory_transfers`

`UpdateTransfer` must be restricted to only allow `notes` updates on pending transfers and must route status→completed through `CompleteTransfer`.

---

### CRITICAL — Transfer Validation Guards (Bug #2)

**File**: `internal/inventory/service.go`  
**Functions**: `CreateTransfer` (L542–556)  
**File**: `internal/inventory/service.go`  
**Struct**: `TransferCreateInput` (L499–506)

**Exact issues**:
1. No `SourceLocationID != DestinationLocationID` check anywhere in service or handler.
2. No query against `inventory_items` to verify source location has `quantity >= input.Quantity` before creating.
3. `Quantity int` with `binding:"required"` only rejects `0`; negative values (e.g. `-5`) pass through. Should be `binding:"required,min=1"`.

**Exact fixes**:

In `TransferCreateInput`:
```go
Quantity int `json:"quantity" binding:"required,min=1"`
```

In `CreateTransfer`, before creating the record:
```go
if input.SourceLocationID == input.DestinationLocationID {
    return nil, &domain.ErrValidation{Field: "destination_location_id", Message: "source and destination cannot be the same"}
}

var srcItem domain.InventoryItem
if err := s.db.Where("product_id = ? AND warehouse_location_id = ?", input.ProductID, input.SourceLocationID).
    First(&srcItem).Error; err != nil {
    return nil, &domain.ErrValidation{Field: "source_location_id", Message: "no inventory found at source location for this product"}
}
if srcItem.Quantity < input.Quantity {
    return nil, &domain.ErrValidation{Field: "quantity", Message: "insufficient stock at source location"}
}
```

---

### CRITICAL — Transfer State Machine (Bug #3)

**File**: `internal/inventory/service.go`  
**Function**: `UpdateTransfer` (L558–571)

**Exact issues**:
1. `t.Status = domain.InventoryTransferStatus(input.Status)` accepts any string (including `"completed"` from `"cancelled"`, or `"pending"` from `"completed"`).
2. `t.CompletedAt` is never set; `completed_at` column stays NULL even after completing.
3. A completed or cancelled transfer can be freely updated again.

**Exact fix**:

Define allowed transitions:
```go
var allowedTransitions = map[domain.InventoryTransferStatus]map[domain.InventoryTransferStatus]bool{
    domain.InventoryTransferStatusPending: {
        domain.InventoryTransferStatusCompleted: true,
        domain.InventoryTransferStatusCancelled: true,
    },
}
```

In `UpdateTransfer`:
```go
if input.Status != "" {
    next := domain.InventoryTransferStatus(input.Status)
    allowed := allowedTransitions[t.Status]
    if !allowed[next] {
        return nil, &domain.ErrValidation{
            Field:   "status",
            Message: fmt.Sprintf("cannot transition from %s to %s", t.Status, next),
        }
    }
    if t.Status == domain.InventoryTransferStatusCompleted || t.Status == domain.InventoryTransferStatusCancelled {
        return nil, &domain.ErrValidation{Field: "status", Message: "transfer is already in a terminal state"}
    }
    if next == domain.InventoryTransferStatusCompleted {
        return s.CompleteTransfer(id)
    }
    t.Status = next
}
```

`completed_at` is set inside `CompleteTransfer` (see Bug #1 fix).

---

### HIGH — DeleteLocation No Inventory Guard (Bug #4)

**File**: `internal/inventory/service.go`  
**Function**: `DeleteLocation` (L266–271)

**Exact issue**: The function calls `s.locationRepo.GetByID(id)` (existence check only) then immediately calls `s.locationRepo.Delete(id)`. There is no query against `inventory_items` to check if the location has stock. `DeleteWarehouse` at L151–166 does perform this check correctly — `DeleteLocation` was simply never given the same treatment.

**Exact fix**:
```go
func (s *Service) DeleteLocation(id uint) error {
    if _, err := s.locationRepo.GetByID(id); err != nil {
        return err
    }
    items, _, err := s.itemRepo.List(map[string]any{"warehouse_location_id": id}, 1, 1)
    if err != nil {
        return err
    }
    if len(items) > 0 {
        return &domain.ErrValidation{
            Field:   "warehouse_location_id",
            Message: "cannot delete a location that has active inventory items",
        }
    }
    return s.locationRepo.Delete(id)
}
```

---

### HIGH — AdjustStock Ambiguity (Bug #5)

**File**: `internal/inventory/service.go`  
**Function**: `AdjustStock` (L581–610)  
**File**: `internal/transport/http/v1/handler_inventory.go`  
**Function**: `AdjustInventory` (L396–412)

**Exact issues**:
1. `items, _, _ = s.itemRepo.List({"product_id": productID}, 1, 100)` then `item := items[0]` — if the product has stock in 3 locations, `items[0]` is the result of `ORDER BY id DESC LIMIT 100`, whichever row happens to appear first. The caller has no control over which location is adjusted.
2. The handler uses `product_id` as the input, not `inventory_item_id`. This makes the endpoint semantically ambiguous for multi-location products.
3. The update `s.itemRepo.Update(item)` happens outside any transaction with no row lock — a race condition between concurrent adjustments.

**Exact fix**:  
Rewrite the route to operate on a specific `InventoryItem` by ID:

Handler input:
```go
var input struct {
    InventoryItemID uint   `json:"inventory_item_id" binding:"required"`
    Delta           int    `json:"delta"             binding:"required"`
    Reason          string `json:"reason"`
}
```

Service method:
```go
func (s *Service) AdjustStockByItemID(itemID uint, delta int, reason string) (*domain.InventoryItem, error) {
    return nil, s.db.Transaction(func(tx *gorm.DB) error {
        var item domain.InventoryItem
        if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&item, itemID).Error; err != nil {
            return &domain.ErrNotFound{Resource: "inventory_item"}
        }
        newQty := item.Quantity + delta
        if newQty < 0 {
            return &domain.ErrValidation{Field: "delta", Message: "adjustment would result in negative stock"}
        }
        return tx.Model(&item).Update("quantity", newQty).Error
    })
}
```

Route: `POST /inventory/adjust` accepts `inventory_item_id` + `delta` (signed integer, can be negative for decrements).

---

### HIGH — Race Conditions in Quantity Ops (Bug #6)

**File**: `internal/inventory/service.go` — all quantity-touching methods  
**File**: `internal/platform/storage/postgres/inventory_item_repository.go` — `Update`

**Exact issue**: Every path that reads then writes a quantity does so in separate, unlocked SQL statements:
1. `DeleteItem`: reads `item.Quantity`, checks `> 0`, then deletes — no lock between read and delete.
2. `AdjustStock`: reads `items[0].Quantity`, increments in Go, calls `Update` — no lock.
3. `CompleteTransfer` (as it would be written without locks): reads source and destination quantities, adjusts in Go — no lock. Two concurrent requests completing the same transfer or two concurrent transfers from the same source location could both see sufficient stock.

**Exact fix pattern** (applies to all quantity operations):
```go
import "gorm.io/gorm/clause"

tx.Clauses(clause.Locking{Strength: "UPDATE"}).
    Where("id = ?", itemID).
    First(&item)
```

All quantity mutations (transfer completion, stock adjustment, item deletion after stock check) must run inside `s.db.Transaction(func(tx *gorm.DB) error { ... })` with `clause.Locking{Strength: "UPDATE"}` applied to every row that is read-then-written. This guarantees serialization at the row level in PostgreSQL.

`gorm.io/gorm` v1.25.12 (current version in go.mod) fully supports `clause.Locking`.

---

### MEDIUM — Status Enum Validation (Bug #7)

**File**: `internal/inventory/service.go`  
**Functions**: `CreateItem` (L343–375), `UpdateTransfer` (L558–571)

**Exact issues**:
1. `CreateItem` L359: `status := domain.InventoryItemStatus(input.Status)` — `input.Status` is a raw string from the request. A value like `"spoiled"` becomes a valid `InventoryItemStatus` value in Go and gets written to the DB (where the CHECK constraint will reject it, returning a confusing 500 instead of a proper 422).
2. `UpdateTransfer` L564: `t.Status = domain.InventoryTransferStatus(input.Status)` — same problem.

**Exact fix**:

Add a validation helper:
```go
var validItemStatuses = map[domain.InventoryItemStatus]bool{
    domain.InventoryItemStatusAvailable: true,
    domain.InventoryItemStatusReserved:  true,
    domain.InventoryItemStatusDamaged:   true,
    domain.InventoryItemStatusSold:      true,
    domain.InventoryItemStatusReturned:  true,
    domain.InventoryItemStatusLost:      true,
}

func validateItemStatus(s string) (domain.InventoryItemStatus, error) {
    st := domain.InventoryItemStatus(s)
    if s != "" && !validItemStatuses[st] {
        return "", &domain.ErrValidation{Field: "status", Message: "invalid status value"}
    }
    return st, nil
}
```

Apply in `CreateItem` and `UpdateItem`. Same pattern for transfer statuses.

---

### MEDIUM — UpdateItem Quantity Zero-Value (Bug #8)

**File**: `internal/inventory/service.go`  
**Struct**: `ItemUpdateInput` (L301–308)  
**Function**: `UpdateItem` (L377–426), specifically L416: `i.Quantity = input.Quantity`

**Exact issue**: `ItemUpdateInput.Quantity` is `int` (not a pointer). When a client sends `{"status": "reserved"}` without a `quantity` field, Go deserializes `Quantity` as `0`. L416 unconditionally assigns `i.Quantity = input.Quantity`, overwriting whatever stock was previously recorded with `0`. This silently zeroes out stock on any partial update.

**Exact fix**:

Change `ItemUpdateInput`:
```go
type ItemUpdateInput struct {
    ProductID           uint   `json:"product_id"`
    WarehouseID         uint   `json:"warehouse_id"`
    WarehouseLocationID *uint  `json:"warehouse_location_id"`
    Quantity            *int   `json:"quantity"`
    Status              string `json:"status"`
    Notes               *string `json:"notes"`
}
```

In `UpdateItem`:
```go
if input.Quantity != nil {
    i.Quantity = *input.Quantity
}
if input.Notes != nil {
    i.Notes = *input.Notes
}
```

The same zero-value issue affects `UpdateWarehouse` (blanks `Address`, `City`, `Notes`) and `UpdateLocation` (blanks `Description`). Those should also be fixed with pointer fields or explicit "omit if empty" logic.

---

### MEDIUM — LensID vs ProductID (Bug #9)

**File**: `internal/domain/inventory.go` L77: `LensID *uint json:"lens_id" gorm:"column:lens_id"`  
**File**: `internal/inventory/service.go` L500: `LensID *uint json:"lens_id"`  
**File**: `convision-api-golang/db/migrations/tenant/000015_...up.sql` L107: `lens_id BIGINT REFERENCES lenses(id) ON DELETE SET NULL`  
**File**: `internal/platform/storage/postgres/inventory_transfer_repository.go` L13: `"lens_id": true` in filter allowlist

**Exact issue**:
- The `inventory_items` table uses `product_id → products`. Correct.
- The `inventory_transfers` table (both Go migration and Laravel DB) was meant to reference the same `products` table, but the Go migration chose `lens_id REFERENCES lenses(id)` — a different table.
- The Laravel DB migration explicitly uses `product_id REFERENCES products(id)` (NOT NULL). The Go migration uses `lens_id REFERENCES lenses(id)` (nullable).
- The field is nullable in Go (`*uint`), meaning a transfer can be created with no product reference at all — an inventory transfer with no product has no business meaning.
- The filter allowlist in the transfer repository uses `"lens_id"` instead of `"product_id"`.

**Decision**: The canonical column must be `product_id → products`, NOT NULL. The Laravel model's use of `lens_id` was a known bug in the original codebase (documented in the reference doc, section 11, inconsistency #1). Go should fix this, not replicate it.

**Exact changes**:

New migration:
```sql
ALTER TABLE inventory_transfers RENAME COLUMN lens_id TO product_id;
ALTER TABLE inventory_transfers DROP CONSTRAINT IF EXISTS inventory_transfers_lens_id_fkey;
ALTER TABLE inventory_transfers ADD CONSTRAINT inventory_transfers_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
ALTER TABLE inventory_transfers ALTER COLUMN product_id SET NOT NULL;
```

`domain/inventory.go`: `LensID *uint` → `ProductID uint` (non-pointer, not nullable), update gorm tag to `gorm:"column:product_id;not null"`, update json tag to `json:"product_id"`.

`inventory/service.go`: `TransferCreateInput.LensID *uint` → `ProductID uint binding:"required"`. `CreateTransfer` updates struct field.

`postgres/inventory_transfer_repository.go`: Replace `"lens_id": true` with `"product_id": true` in filter allowlist; update `Update` map key from `"lens_id"` to `"product_id"`.

---

### LOW — GetTotalStock Response Shape (Bug #10)

**File**: `internal/transport/http/v1/handler_inventory.go`  
**Function**: `GetTotalStock` (L260–287)

**Exact issue**:  
- No query params → calls `h.inventory.TotalStock()` → returns `{"total_quantity": 42}` (scalar struct)
- With `warehouse_id` or `warehouse_location_id` → calls `h.inventory.TotalStockPerProduct(filters)` → returns `{"data": [...]}`

Two different shapes for the same endpoint forces frontend to conditionally parse the response.

**Exact fix**: Always call `TotalStockPerProduct`. Add a `total_units` summary field. Remove the separate `TotalStock()` scalar code path from handler and service.

```go
func (h *Handler) GetTotalStock(c *gin.Context) {
    filters := map[string]any{}
    // ... parse warehouse_id, warehouse_location_id same as before ...
    out, err := h.inventory.TotalStockPerProduct(filters)
    if err != nil {
        respondError(c, err)
        return
    }
    var totalUnits int64
    for _, e := range out {
        totalUnits += e.TotalQuantity
    }
    c.JSON(http.StatusOK, gin.H{
        "data":        out,
        "total_units": totalUnits,
    })
}
```

The `TotalStock()` method on the service and repository can be removed or kept as an internal utility.

---

### ADDITIONAL — Missing `warehouse_location_id` Filter in ListInventoryItems (Bug #11)

**File**: `internal/transport/http/v1/handler_inventory.go`  
**Function**: `ListInventoryItems` (L179–201)

**Exact issue**: The handler parses `product_id`, `warehouse_id`, and `status` from query params but NOT `warehouse_location_id`. The repository supports this filter via `inventoryItemFilterAllowlist`. The Laravel reference explicitly lists `warehouse_location_id` as a supported filter.

**Exact fix**: Add to `ListInventoryItems`:
```go
if v := c.Query("warehouse_location_id"); v != "" {
    if id, err := strconv.ParseUint(v, 10, 64); err == nil {
        filters["warehouse_location_id"] = uint(id)
    }
}
```

---

### ADDITIONAL — TransferCreateInput Negative Quantity (Bug #12)

**File**: `internal/inventory/service.go` L503:
```go
Quantity int `json:"quantity" binding:"required"`
```

`binding:"required"` on `int` rejects zero but accepts negative values (`-5` passes). Must be `binding:"required,min=1"`. Already covered in Bug #2 fix above.

---

### ADDITIONAL — InventoryTransferRepository.Update Exposes Immutable Fields (Bug #13)

**File**: `internal/platform/storage/postgres/inventory_transfer_repository.go`  
**Function**: `Update` (L52–63)

The repository `Update` method writes `source_location_id`, `destination_location_id`, and `quantity` — fields that should be immutable once a transfer is created. While the current service's `UpdateTransfer` only passes `notes` and `status`, any future developer who calls `transferRepo.Update` directly could corrupt these fields.

**Fix**: The repository `Update` should only persist mutable fields (`notes`, `status`, `completed_at`). Separate methods or a targeted update query should handle the full update use-case only at creation time.

---

## Implementation Approach

### Atomic Transactions in GORM

GORM v1.25.x (current: v1.25.12) supports two transaction patterns. Use both:

**Pattern 1 — Service-level transaction closure** (preferred for multi-step operations):
```go
import (
    "gorm.io/gorm"
    "gorm.io/gorm/clause"
)

func (s *Service) CompleteTransfer(id uint) (*domain.InventoryTransfer, error) {
    var result *domain.InventoryTransfer
    err := s.db.Transaction(func(tx *gorm.DB) error {
        var t domain.InventoryTransfer
        if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
            First(&t, id).Error; err != nil {
            return err
        }

        if t.Status != domain.InventoryTransferStatusPending {
            return &domain.ErrValidation{Field: "status", Message: "transfer is not pending"}
        }

        var src domain.InventoryItem
        if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
            Where("product_id = ? AND warehouse_location_id = ?", t.ProductID, t.SourceLocationID).
            First(&src).Error; err != nil {
            return &domain.ErrValidation{Field: "source_location_id", Message: "no inventory item found at source"}
        }
        if src.Quantity < t.Quantity {
            return &domain.ErrValidation{Field: "quantity", Message: "insufficient stock at source location"}
        }

        if err := tx.Model(&src).Update("quantity", src.Quantity-t.Quantity).Error; err != nil {
            return err
        }

        var dst domain.InventoryItem
        err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
            Where("product_id = ? AND warehouse_location_id = ?", t.ProductID, t.DestinationLocationID).
            First(&dst).Error
        if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
            return err
        }
        if errors.Is(err, gorm.ErrRecordNotFound) {
            dst = domain.InventoryItem{
                ProductID:           t.ProductID,
                WarehouseLocationID: &t.DestinationLocationID,
                Quantity:            t.Quantity,
                Status:              domain.InventoryItemStatusAvailable,
            }
            if err := tx.Create(&dst).Error; err != nil {
                return err
            }
        } else {
            if err := tx.Model(&dst).Update("quantity", dst.Quantity+t.Quantity).Error; err != nil {
                return err
            }
        }

        now := time.Now()
        t.Status = domain.InventoryTransferStatusCompleted
        t.CompletedAt = &now
        if err := tx.Model(&t).Updates(map[string]any{
            "status":       t.Status,
            "completed_at": t.CompletedAt,
        }).Error; err != nil {
            return err
        }

        result = &t
        return nil
    })
    if err != nil {
        return nil, err
    }
    return s.transferRepo.GetByID(result.ID)
}
```

**Key requirement**: The `inventory.Service` struct must hold a `db *gorm.DB` field (injected through `NewService`). This is the minimal change to enable transaction management without polluting domain interfaces.

`NewService` signature changes from:
```go
func NewService(warehouseRepo, locationRepo, itemRepo, transferRepo, logger) *Service
```
to:
```go
func NewService(db *gorm.DB, warehouseRepo, locationRepo, itemRepo, transferRepo, logger) *Service
```

Update `cmd/api/main.go` to pass `db` as the first argument.

---

### Transfer State Machine

Allowed transitions (no external library needed):

```go
var allowedTransitions = map[domain.InventoryTransferStatus]map[domain.InventoryTransferStatus]bool{
    domain.InventoryTransferStatusPending: {
        domain.InventoryTransferStatusCompleted: true,
        domain.InventoryTransferStatusCancelled: true,
    },
    domain.InventoryTransferStatusCompleted: {},
    domain.InventoryTransferStatusCancelled: {},
}
```

- `pending → completed`: triggers `CompleteTransfer` (atomic stock movement + `completed_at` stamp)
- `pending → cancelled`: updates status only, no stock movement
- `completed → *` and `cancelled → *`: blocked at service layer with `ErrValidation`

The `UpdateTransfer` service method becomes a dispatcher:
- If new status is provided → validate transition → route accordingly
- If only `notes` is provided → only updates notes (allowed on pending; blocked on terminal states)

---

### Testing Strategy

**Recommendation: curl/shell script integration tests** (not Go `httptest`).

**Rationale**:
- Zero test infrastructure exists (confirmed: 0 `_test.go` files found in entire `convision-api-golang/`).
- Adding a Go test suite with a test DB requires: Docker Compose setup, test DB migrations, test data seeding, and significant boilerplate. This is at minimum a 2-3 day effort before writing a single test assertion.
- Phase 8's success criterion (per ROADMAP) is "integration-test verification evidence" — curl scripts running against the real running service satisfy this requirement directly.
- The running service already has seeded data (InventorySeeder in Laravel), which gives a real data set.
- curl scripts are immediately runnable by any team member, no Go toolchain required.

**Test script structure** (`scripts/test-inventory.sh`):
```bash
#!/usr/bin/env bash
BASE="http://localhost:8001/api/v1"
TOKEN="..."     # from auth/login

# Test: source == destination is rejected
curl -s -X POST "$BASE/inventory-transfers" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"product_id":1,"source_location_id":1,"destination_location_id":1,"quantity":5}' \
  | jq '.message'   # expect validation error

# Test: insufficient stock is rejected
# Test: complete transfer moves stock (verify inventory_items before and after)
# Test: double-complete is rejected
# Test: delete location with inventory is rejected
# Test: AdjustStock with specific item_id
```

Each test scenario: setup → action → assert response + verify DB state via GET endpoints.

---

### LensID → ProductID Migration

All changes required:

| File | Change |
|---|---|
| `db/migrations/tenant/000016_rename_lens_id_to_product_id.up.sql` | New migration: RENAME COLUMN, DROP old FK, ADD new FK to products, SET NOT NULL |
| `db/migrations/tenant/000016_rename_lens_id_to_product_id.down.sql` | Reverse migration |
| `internal/domain/inventory.go` | `LensID *uint` → `ProductID uint`; gorm tag `column:lens_id` → `column:product_id;not null`; json tag `lens_id` → `product_id` |
| `internal/inventory/service.go` | `TransferCreateInput.LensID *uint` → `ProductID uint binding:"required"`; `CreateTransfer` struct literal; `InventoryTransfer` initialization |
| `internal/platform/storage/postgres/inventory_transfer_repository.go` | Filter allowlist: replace `"lens_id"` with `"product_id"`; `Update` map: replace `"lens_id"` key with `"product_id"` |

Also: the destination inventory item's `WarehouseID` must be looked up (from `WarehouseLocation`) in `CompleteTransfer` to properly populate any new `InventoryItem` row. The destination item needs `warehouse_id`, which requires fetching the destination location's `warehouse_id`.

---

## Validation Architecture

How to verify each fix works after implementation:

| Bug | Verification |
|---|---|
| Bug #1 — Stock movement | Create transfer (record src qty). Complete it. GET inventory items for src and dst — verify src decreased, dst increased. |
| Bug #2 — Validation guards | POST transfer with src==dst → expect 422. POST transfer with qty=100 when stock=5 → expect 422. POST with qty=-1 → expect 422. |
| Bug #3 — State machine | Complete a transfer twice → second call returns 422. Cancel a completed transfer → returns 422. Check `completed_at` is set after completion. |
| Bug #4 — DeleteLocation guard | POST inventory item to location. Try DELETE location → expect 422. Delete the item. Try DELETE location again → expect 204. |
| Bug #5 — AdjustStock fix | POST `/inventory/adjust` with valid `inventory_item_id` and `delta`. GET the item — verify quantity changed correctly. Try delta that would go negative → expect 422. |
| Bug #6 — Race conditions | Run 10 concurrent transfer-complete requests for a transfer with qty=5 and src stock=5. Exactly 1 should succeed; 9 should fail. Verify src item qty=0. |
| Bug #7 — Status enum | POST inventory item with `"status":"spoiled"` → expect 422 with message, not 500. |
| Bug #8 — UpdateItem zero | PUT item with only `{"status":"reserved"}` (no quantity). GET item — verify quantity unchanged. |
| Bug #9 — LensID→ProductID | POST transfer with `product_id` field → succeeds. Old `lens_id` field → should be ignored or 422. |
| Bug #10 — TotalStock shape | GET `/inventory/total-stock` with no params → `{"data":[...],"total_units":N}`. With `warehouse_id` → same shape. |

---

## File Change Map

| File | Changes Needed | Impact |
|---|---|---|
| `internal/domain/inventory.go` | Rename `LensID → ProductID` (non-nullable); add `InventoryTransferRepository.CompleteWithStockMove` to interface? (or keep as service-level) | Domain contract changes |
| `internal/inventory/service.go` | Add `db *gorm.DB` field; add `CompleteTransfer`; fix `UpdateTransfer` state machine; fix `DeleteLocation` guard; fix `AdjustStock → AdjustStockByItemID`; fix status validation; fix UpdateItem pointer fields; fix TransferCreateInput bindings | Core business logic |
| `internal/platform/storage/postgres/inventory_transfer_repository.go` | `lens_id → product_id` in filter + update map; restrict `Update` to mutable fields only | Repository layer |
| `internal/transport/http/v1/handler_inventory.go` | Fix `AdjustInventory` input struct; fix `GetTotalStock` unified response; add `warehouse_location_id` filter to `ListInventoryItems` | HTTP layer |
| `internal/transport/http/v1/routes.go` | No structural changes needed | — |
| `cmd/api/main.go` | Pass `db` to `inventorysvc.NewService` | Wiring |
| `db/migrations/tenant/000016_*.sql` | New migration: rename `lens_id → product_id`, change FK, SET NOT NULL | DB schema |
| `scripts/test-inventory.sh` | New: curl-based integration test script | Verification |

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| The destination inventory item may not exist when completing a transfer (product never had stock there before) | HIGH | `CompleteTransfer` must CREATE a new `InventoryItem` for the destination if none exists. Must look up `warehouse_id` from the destination `WarehouseLocation`. |
| The `uq_inventory_item_product_location` unique constraint may fire on destination insert if two concurrent transfers complete simultaneously | MEDIUM | The `SELECT FOR UPDATE` on the destination item row handles this — GORM's `FirstOrCreate` is NOT safe here; use explicit lock then create. |
| Renaming `lens_id → product_id` is a breaking DB migration | HIGH | Requires coordination: run migration before deploying new Go binary. The down migration is reversible. No existing frontend code references `lens_id` in transfers directly. |
| `AdjustStock` endpoint signature change breaks existing callers | MEDIUM | The current endpoint uses `product_id` — check frontend `convision-front/` for any calls to `/inventory/adjust`. Update those callers when the endpoint changes to `inventory_item_id + delta`. |
| `UpdateItem` pointer fields change response behavior | LOW | Existing clients sending `quantity` as a JSON number still work. Clients omitting `quantity` field now correctly leave it unchanged (was silently zeroing before — this is a bugfix, not a regression). |
| No test infrastructure means regressions are caught manually only | MEDIUM | The curl test script provides repeatable regression coverage for the critical paths. A future phase should add proper Go test infrastructure. |
| Race condition fix requires `s.db` in service — this leaks GORM into the service layer | LOW | The codebase is brownfield and already couples repo implementations to GORM directly. The `db` field is isolated to `CompleteTransfer` and `AdjustStockByItemID`. This is an acceptable pragmatic trade-off. |

---

## RESEARCH COMPLETE
