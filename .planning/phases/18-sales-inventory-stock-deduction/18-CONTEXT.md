# Phase 18: Sales-Inventory Stock Deduction — Context

**Gathered:** 2026-05-06
**Status:** Ready for planning
**Source:** Pre-researched by engineer — full domain investigation completed before planning

<domain>
## Phase Boundary

Connect `internal/sale/service.go` to the existing WMS inventory layer (`InventoryItem` + `StockMovement`) so that:

- **Sale creation** deducts stock from `inventory_items` for any `SaleItem` whose linked `Product.tracks_stock = true`, and records a `StockMovement` of type `exit` in the kardex.
- **Sale cancellation** reverses that deduction: adds stock back to `inventory_items` and records a `StockMovement` of type `adjustment_add` (with a note marking it as a cancellation reversal).
- **No frontend changes** — the deduction is transparent to the UI.
- **No blocking on zero stock** — if no inventory exists for a product, the sale still completes; the service logs a warning.

</domain>

<decisions>
## Implementation Decisions

### D-01: Which products deduct stock
Only items where `Product.tracks_stock = true` trigger inventory deduction.
- tracks_stock=true: frame, accessory, contact_lens, liquid
- tracks_stock=false: lens (catalogue lenses — no stock deduction, ever)

### D-02: How to find the InventoryItem to deduct
Lookup by `(product_id, branch_id)`. If multiple warehouses exist for the same product+branch, take the one with the highest `quantity`. Use `inventoryItemRepo.List(db, filters, 1, 1)` with filters `{product_id: X, branch_id: Y}` and sort by quantity descending.

If no InventoryItem exists → log warning, skip deduction, sale proceeds.

### D-03: Insufficient stock behavior
The sale ALWAYS completes regardless of stock level. If `InventoryItem.Quantity < SaleItem.Quantity`:
- Deduct down to 0 (do not go negative)
- Log warning with product_id, available qty, requested qty
- Write StockMovement anyway (exit with the amount actually deducted)

This matches the business rule: the clinic sells on backorder and reconciles later.

### D-04: StockMovement fields for a sale exit
```go
StockMovement{
    ClinicID:      sale.ClinicID,
    BranchID:      sale.BranchID,
    ProductID:     item.ProductID,
    WarehouseID:   inventoryItem.WarehouseID,
    MovementType:  domain.MovementTypeExit,           // "exit"
    ReferenceType: domain.ReferenceTypeSale,           // "sale"
    ReferenceID:   &saleID,
    Quantity:      deductedQty,
    Notes:         "",
    CreatedBy:     userID,
}
```

### D-05: StockMovement fields for a cancellation reversal
```go
StockMovement{
    ClinicID:      sale.ClinicID,
    BranchID:      sale.BranchID,
    ProductID:     item.ProductID,
    WarehouseID:   inventoryItem.WarehouseID,
    MovementType:  domain.MovementTypeAdjustmentAdd,   // "adjustment_add"
    ReferenceType: domain.ReferenceTypeSale,
    ReferenceID:   &saleID,
    Quantity:      restoredQty,
    Notes:         "stock reversal due to sale cancellation",
    CreatedBy:     sale.CreatedBy,  // original creator
}
```

### D-06: Finding the original exit movement on cancellation
To know how much to restore per item, query `StockMovementRepository` for movements with:
- `reference_type = "sale"`
- `reference_id = saleID`
- `movement_type = "exit"`
- `product_id = item.ProductID`

If `StockMovementRepository` does not yet support these filters, add a `FindBySaleAndProduct(db, saleID, productID)` method to the interface and its postgres implementation.

### D-07: Dependency injection — wire into main.go
```go
saleService := salesvc.NewService(
    db,
    saleRepo,
    adjRepo,
    productRepo,
    labOrderRepo,
    labRepo,
    appointmentRepo,
    inventoryItemRepo,      // NEW
    stockMovementRepo,      // NEW
    logger,
)
```
`inventoryItemRepo` and `stockMovementRepo` are already instantiated in `cmd/api/main.go` before `saleService`.

### D-08: Service struct changes
```go
type Service struct {
    db              *gorm.DB
    repo            domain.SaleRepository
    adjRepo         domain.SaleAdjustmentRepository
    productRepo     domain.ProductRepository
    labOrderRepo    domain.LabOrderRepository
    labRepo         domain.LaboratoryRepository
    appointmentRepo domain.AppointmentRepository
    itemRepo        domain.InventoryItemRepository   // NEW
    movementRepo    domain.StockMovementRepository   // NEW
    logger          *zap.Logger
}
```

### D-09: Private helpers — keep handlers thin
Two private methods on the service:
- `deductStock(ctx, saleID, items []domain.SaleItem, branchID uint, userID uint) error` — called at the end of `Create` after the sale is persisted
- `revertStock(ctx, saleID, items []domain.SaleItem, branchID uint) error` — called at the start of `Cancel` before the sale status changes

Both are best-effort (log warnings, never return errors that block the primary operation).

### D-10: Transaction scope
The deduction should happen inside the same DB transaction as the sale creation if feasible. If the service's `Create` already uses a transaction, pass it through. If not, wrap the deduction in its own short transaction so the movement + item update are atomic with each other (even if they're not atomic with the sale itself).

### Agent's Discretion
- Whether to add `FindBySaleAndProduct` to `StockMovementRepository` interface or implement an alternative lookup
- Exact error/warning log message format (use Zap structured fields)
- Whether to use a single transaction for sale + stock or two separate transactions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & conventions
- `convision-api-golang/DEVELOPMENT_GUIDE.md` — 3-layer architecture, service patterns, RBAC, error mapping
- `convision-api-golang/DATABASE_GUIDE.md` — DB types, index rules, soft-delete, migration patterns

### Domain models
- `convision-api-golang/internal/domain/inventory.go` — InventoryItem, StockMovement structs and repository interfaces; movement type constants
- `convision-api-golang/internal/domain/sale.go` — Sale, SaleItem structs, SaleRepository interface
- `convision-api-golang/internal/domain/product.go` — Product struct with TracksStock bool

### Service to modify
- `convision-api-golang/internal/sale/service.go` — NewService signature, Create and Cancel methods, current struct

### Repository implementations (read for patterns)
- `convision-api-golang/internal/platform/storage/postgres/inventory_item_repository.go` — List filter allowlist, Update method
- `convision-api-golang/internal/platform/storage/postgres/stock_movement_repository.go` — Create method, existing interface

### Wire-up point
- `convision-api-golang/cmd/api/main.go` — instantiation order; inventoryItemRepo and stockMovementRepo already exist before saleService

</canonical_refs>

<specifics>
## Specific Ideas

### Existing constants to reuse (from domain/inventory.go)
```go
MovementTypeEntry          = "entry"
MovementTypeExit           = "exit"
MovementTypeAdjustmentAdd  = "adjustment_add"
MovementTypeAdjustmentSub  = "adjustment_sub"

ReferenceTypeSale          = "sale"
ReferenceTypePurchase      = "purchase"
ReferenceTypeAdjustment    = "adjustment"
```

### InventoryItemRepository.List filter allowlist
Supports: `product_id`, `warehouse_id`, `branch_id`, `status`

### Currently wired repos in main.go (before saleService)
```go
inventoryItemRepo  := postgres.NewInventoryItemRepository()
stockMovementRepo  := postgres.NewStockMovementRepository()
// ... later:
saleService := salesvc.NewService(db, saleRepo, adjRepo, productRepo, labOrderRepo, labRepo, appointmentRepo, logger)
```
→ Add `inventoryItemRepo, stockMovementRepo` to the NewService call.

</specifics>

<deferred>
## Deferred Ideas

- Frontend stock level indicator on sale form (out of scope — UI transparent)
- Backorder alerts / notification when stock goes to 0 (future feature)
- Real-time stock reservation (pessimistic locking) — not needed at current scale

</deferred>

---

*Phase: 18-sales-inventory-stock-deduction*
*Context gathered: 2026-05-06 — pre-researched by engineer*
