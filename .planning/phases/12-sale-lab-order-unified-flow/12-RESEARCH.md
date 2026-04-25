# Phase 12 Research: Sale → LaboratoryOrder Unified Flow

## Summary

Phase 12 modifies three Go backend layers (domain, service, repository) plus the frontend to unify the commercial flow.
The domain changes are additive: `SaleItem` needs 3 new columns (`product_type`, `name`, `description` — `product_id` already exists in the DB), `LaboratoryOrder` needs `GetBySaleID` and the Sale preloaded in `withRelations`, and `LaboratoryRepository` needs `GetFirstActive()`.
The orchestration point (`sale.Service.Create`) must be extended with two new injected repos and a best-effort post-sale async step.
The status sync (`delivered → completed`) is cleanest as handler-level code in `UpdateLaboratoryOrderStatus` using the already-injected `h.sale` service — no circular import.
All `Appointment` billing fields (`is_billed`, `billed_at`, `sale_id`) already exist in the Go domain — no migration needed for them.
Frontend work is limited: hide `OrderList` page/nav link, surface `Sale` as primary link on LaboratoryOrder tracker, and expand `SaleItem` inputs to accept generic products.

---

## Findings by Question

### Q1 — Current SaleItem structure & migration needed

**Current `domain.SaleItem` fields:**

```go
ID        uint
SaleID    uint
LensID    *uint     // column: lens_id — FK to lenses/products
Quantity  int
Price     float64
Discount  float64
Total     float64
Notes     string
CreatedAt time.Time
UpdatedAt time.Time
```

**What the DB already has (migration 000011):**
```sql
sale_items: id, sale_id, lens_id, product_id, quantity, price, discount, total, notes, created_at, updated_at
```
`product_id` **already exists** in the DB. It is NOT mapped in the Go struct.

**What the DB is missing (migration required):**
```sql
ALTER TABLE sale_items
    ADD COLUMN IF NOT EXISTS product_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS name         TEXT,
    ADD COLUMN IF NOT EXISTS description  TEXT;
```

**Go domain struct additions needed:**
```go
ProductID   *uint  `json:"product_id"   gorm:"column:product_id"`
ProductType string `json:"product_type" gorm:"type:varchar(50)"`
Name        string `json:"name"         gorm:"type:text"`
Description string `json:"description"  gorm:"type:text"`
```

**Association note:** The existing `Product *Product gorm:"foreignKey:LensID"` association uses `LensID` as the FK. For generic product items, a second association pointing to `ProductID` should be added (or keep separate associations for lens vs. product).

**`sale.Service.ItemInput` DTO** also needs the same fields:
```go
ProductID   *uint  `json:"product_id"`
ProductType string `json:"product_type"`
Description string `json:"description"`
```
And the `items[i]` build in `Create()` must copy these fields through.

---

### Q2 — Repository gap: GetBySaleID

**Current `domain.LaboratoryOrderRepository` interface** (`domain/laboratory.go` lines 110–121):
```
GetByID, GetByOrderNumber, Create, Update, Delete, List,
AddStatusEntry, AddEvidence, GetEvidence, Stats
```
`GetBySaleID` **does not exist**.

**Add to interface:**
```go
GetBySaleID(saleID uint) (*LaboratoryOrder, error)
```

**Add to `postgres.LaboratoryOrderRepository`:**
```go
func (r *LaboratoryOrderRepository) GetBySaleID(saleID uint) (*domain.LaboratoryOrder, error) {
    var o domain.LaboratoryOrder
    err := r.withRelations(r.db).Where("sale_id = ?", saleID).First(&o).Error
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, nil
    }
    return &o, err
}
```
Returns `(nil, nil)` when no record exists — this is the idempotency check pattern.

**Also needed:** `LaboratoryOrder.Sale` association preload in `withRelations`. Currently only `Laboratory`, `Patient`, `CreatedByUser`, `StatusHistory`, `Evidence` are preloaded. Add:
```go
Preload("Sale")
```
The `Sale` field is already declared in `domain.LaboratoryOrder` as `LaboratoryOrders []LaboratoryOrder gorm:"-"` on Sale side, but the reverse `Sale *Sale` is not declared on `LaboratoryOrder`. That association must be added to the domain struct.

---

### Q3 — Repository gap: default laboratory

**Current `domain.LaboratoryRepository` interface** (`domain/laboratory.go` lines 101–107):
```
GetByID, Create, Update, Delete, List
```
No `GetFirstActive` method exists.

**Laravel reference (`SaleService.php` line 435):**
```php
$activeLab = \App\Models\Laboratory::where('status', 'active')->first();
return $activeLab ?? \App\Models\Laboratory::first();
```

**Add to interface:**
```go
GetFirstActive() (*Laboratory, error)
```

**Add to `postgres.LaboratoryRepository`:**
```go
func (r *LaboratoryRepository) GetFirstActive() (*domain.Laboratory, error) {
    var l domain.Laboratory
    err := r.db.Where("status = ?", "active").Order("id ASC").First(&l).Error
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, nil
    }
    return &l, err
}
```
Returns `(nil, nil)` — caller logs warning and skips lab order creation.

---

### Q4 — sale.Service dependency injection

**Current `NewService` signature** (`internal/sale/service.go` lines 21–33):
```go
func NewService(
    saleRepo    domain.SaleRepository,
    adjRepo     domain.SaleLensPriceAdjustmentRepository,
    productRepo domain.ProductRepository,
    logger      *zap.Logger,
) *Service
```

**Target signature:**
```go
func NewService(
    saleRepo        domain.SaleRepository,
    adjRepo         domain.SaleLensPriceAdjustmentRepository,
    productRepo     domain.ProductRepository,
    labOrderRepo    domain.LaboratoryOrderRepository,
    labRepo         domain.LaboratoryRepository,
    appointmentRepo domain.AppointmentRepository,
    logger          *zap.Logger,
) *Service
```

**Wiring point — `cmd/api/main.go` line 143:**
```go
saleService := salesvc.NewService(saleRepo, saleLensAdjRepo, productRepo, logger)
```
Change to:
```go
saleService := salesvc.NewService(
    saleRepo, saleLensAdjRepo, productRepo,
    laboratoryOrderRepo, laboratoryRepo, appointmentRepo,
    logger,
)
```
`laboratoryOrderRepo` is declared at line 111, `appointmentRepo` at line 71 — both already available.

---

### Q5 — Handler orchestration: UpdateLaboratoryOrderStatus

**Exact location** (`handler_laboratory.go` lines 241–267):
```go
func (h *Handler) UpdateLaboratoryOrderStatus(c *gin.Context) {
    // ... parse id, parse input, get claims ...
    o, err := h.laboratory.UpdateOrderStatus(id, input, claims.UserID)
    if err != nil {
        respondError(c, err)
        return
    }
    c.JSON(http.StatusOK, o)  // ← ADD STATUS SYNC HOOK HERE
}
```

**Status sync block to insert between `UpdateOrderStatus` and `c.JSON`:**
```go
if input.Status == "delivered" && o.SaleID != nil {
    sale, sErr := h.sale.GetByID(*o.SaleID)
    if sErr == nil && sale.Balance <= 0 {
        _, _ = h.sale.Update(*o.SaleID, salesvc.UpdateInput{Status: "completed"})
    }
}
```

**No circular import:** `handler.go` already imports `salesvc` (field `sale *salesvc.Service` line 110) and `labsvc` (field `laboratory *labsvc.Service` line 112). Adding `h.sale.GetByID` / `h.sale.Update` in `handler_laboratory.go` does not introduce any new import.

The import `salesvc "github.com/convision/api/internal/sale"` must be added to `handler_laboratory.go`'s import block (it only imports `labsvc` currently).

---

### Q6 — Appointment domain fields

**All three required fields already exist** in `domain.Appointment` (`domain/appointment.go` lines 56–58):
```go
IsBilled  bool       `json:"is_billed"  gorm:"not null;default:false"`
BilledAt  *time.Time `json:"billed_at"`
SaleID    *uint      `json:"sale_id"    gorm:"column:sale_id"`
```

**No domain migration needed for Appointment.**

`AppointmentRepository.Update(a *Appointment) error` is in the interface and postgres implementation — sufficient for the billing update.

The Go `appointment_repository.go` implementation needs `is_billed`, `billed_at`, `sale_id` included in its `Update` map. This should be verified in Plan 12-03.

---

### Q7 — DB migration mechanism

**Primary mechanism: custom SQL migration runner** via `cmd/migrate/main.go`.

- Migration files live in `db/migrations/tenant/` (tenant-scoped) or `db/migrations/platform/` (platform-level)
- File naming: `{000001}__{description}.up.sql` / `{000001}__{description}.down.sql`
- Runner tracks applied migrations in `schema_migrations` table
- **For local dev only:** `postgres.Migrate()` in `db.go` runs GORM `AutoMigrate` when `APP_ENV=local`

**How to create a new migration:**
```bash
cd convision-api-golang
go run ./cmd/migrate -new sale_item_generic_products
# Creates db/migrations/tenant/000018_sale_item_generic_products.up.sql
#         db/migrations/tenant/000018_sale_item_generic_products.down.sql
```

**Migration content for Phase 12 (tenant scope):**

Up:
```sql
ALTER TABLE sale_items
    ADD COLUMN IF NOT EXISTS product_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS name         TEXT,
    ADD COLUMN IF NOT EXISTS description  TEXT;
```

Down:
```sql
ALTER TABLE sale_items
    DROP COLUMN IF EXISTS product_type,
    DROP COLUMN IF EXISTS name,
    DROP COLUMN IF EXISTS description;
```

**Note:** No new `product_id` column needed — it already exists from migration 000011.

---

### Q8 — Order entity removal scope (frontend)

Files containing ORD/order references:

| File | What to do |
|------|-----------|
| `src/App.tsx` line 31 | `import OrderList from "./pages/receptionist/OrderList"` — remove import and route |
| `src/pages/receptionist/OrderList.tsx` | Entire page — keep file but remove route from App.tsx |
| `src/layouts/AdminLayout.tsx` | Navigation link for Orders (ORD) — remove from sidebar |
| `src/services/laboratoryOrderService.ts` | `order` relation still in type — keep for backward compat but deprioritize in UI display |
| `src/pages/admin/LaboratoryOrderDetail.tsx` | May reference `order.order_number` — replace with `sale.sale_number` |
| `src/pages/receptionist/LabOrderDetail.tsx` | Same — check for `order` references |
| `src/pages/receptionist/NewSale.tsx` | May have `order_id` field — remove from UI (keep as optional in API) |

**Backend routes:** Keep `/api/v1/orders` endpoints intact (per D-06 — backward compat), just don't link them from the frontend.

---

### Q9 — LaboratoryOrder.sale association in frontend

**Current `laboratoryOrderService.ts` `LaboratoryOrder` type** (lines 32–64):
```typescript
order?: {
    id: number;
    order_number: string;
    items: Array<{ id: number; lens?: { ... } }>;
};
sale?: {
    id: number;
    sale_number: string;
};
```

Both `order` and `sale` are **already in the TypeScript type definition**. The `sale` field is already supported.

**Backend gap:** In `postgres.LaboratoryOrderRepository.withRelations()`, `Sale` is NOT preloaded:
```go
func (r *LaboratoryOrderRepository) withRelations(q *gorm.DB) *gorm.DB {
    return q.
        Preload("Laboratory").
        Preload("Patient").
        Preload("CreatedByUser").
        Preload("StatusHistory", ...).
        Preload("StatusHistory.User").
        Preload("Evidence").
        Preload("Evidence.User")
        // ← Missing: Preload("Sale")
}
```

**Domain gap:** `domain.LaboratoryOrder` does not have a `Sale *Sale` association field — only `SaleID *uint`. Must add:
```go
Sale *Sale `json:"sale,omitempty" gorm:"foreignKey:SaleID"`
```

**Frontend changes needed:**
- In `LabOrderDetail.tsx` / `AdminLabOrderTracker.tsx`: surface `sale.sale_number` as primary link instead of `order.order_number`
- The `order` subtype on `LaboratoryOrder` can stay in the TypeScript type for backward compat

---

### Q10 — Transaction safety (GORM multi-step)

**Architecture reality:** The current `sale.Service` uses an injected `domain.SaleRepository` interface — it does not hold a `*gorm.DB` directly. Cross-repo transactions require either: (a) passing `*gorm.DB` to the service, or (b) keeping operations independent.

**Decision from CONTEXT D-02 / discretion note:** "Error handling strategy when LaboratoryOrder auto-creation fails (sale already committed — should warn but not rollback sale)."

**Recommended pattern for Phase 12 (best-effort, consistent with existing patterns):**

```go
func (s *Service) Create(input CreateInput, userID uint) (*domain.Sale, error) {
    // Step 1: Create sale (sale + items + payments in one GORM create with associations)
    sale, err := /* existing logic */
    if err != nil {
        return nil, err
    }

    // Step 2: Update appointment billing (best-effort — do not fail sale)
    s.updateAppointmentBilling(sale, userID)

    // Step 3: Create lab order if lenses present (best-effort — do not fail sale)
    s.createLabOrderIfNeeded(sale, input.Items, input.LaboratoryID, userID)

    return s.saleRepo.GetByID(sale.ID)
}
```

Steps 2 and 3 call private helpers that log errors with `s.logger.Warn(...)` and swallow them.

**If strict atomicity is required later:** Expose `db.Transaction(func(tx *gorm.DB) error {...})` through a `WithTx` method on repositories. This is deferred as the context explicitly states sale should not rollback if lab order fails.

**GORM transaction pattern (for reference, if needed in Plan 12-02):**
```go
// Inject *gorm.DB into Service if atomic guarantee across repos is needed
err := s.db.Transaction(func(tx *gorm.DB) error {
    // use tx-scoped repo operations
    return nil
})
```

---

## Implementation Path

Recommended execution order for the 4 plans:

### Plan 12-01: Backend — Domain & DB
1. Create migration `000018_sale_item_generic_products` — add `product_type`, `name`, `description` to `sale_items`
2. Update `domain.SaleItem` — add `ProductID`, `ProductType`, `Name`, `Description`; fix `Product` association
3. Update `domain.LaboratoryOrder` — add `Sale *Sale` association field
4. Update `domain.LaboratoryOrderRepository` interface — add `GetBySaleID`
5. Update `domain.LaboratoryRepository` interface — add `GetFirstActive`
6. Update `postgres.LaboratoryOrderRepository` — implement `GetBySaleID`, add `Preload("Sale")` to `withRelations`
7. Update `postgres.LaboratoryRepository` — implement `GetFirstActive`
8. Update `postgres.AppointmentRepository.Update` — ensure `is_billed`, `billed_at`, `sale_id` are included in the update map

### Plan 12-02: Backend — Sale service orchestrator
1. Update `sale.ItemInput` DTO — add `ProductID`, `ProductType`, `Description`
2. Update `sale.Service` struct — add `labOrderRepo`, `labRepo`, `appointmentRepo` fields
3. Update `sale.NewService` — add 3 new parameters
4. Update `sale.Service.Create` — copy new fields through to `domain.SaleItem`, call `createLabOrderIfNeeded` and `updateAppointmentBilling` after sale commit
5. Implement `createLabOrderIfNeeded` private helper
6. Implement `updateAppointmentBilling` private helper
7. Update `cmd/api/main.go` wiring (line 143)

### Plan 12-03: Backend — Status sync
1. Update `handler_laboratory.go:UpdateLaboratoryOrderStatus` — add delivered→completed sync after successful `UpdateOrderStatus`
2. Add `salesvc` import to `handler_laboratory.go`
3. Validate: `sale.Balance <= 0` check before marking completed

### Plan 12-04: Frontend — Unified flow UI
1. Remove `OrderList` from `App.tsx` routes
2. Remove Orders navigation link from `AdminLayout.tsx` sidebar
3. Update `SaleItem` form inputs in sale creation to accept `product_type`, `name`, `description`
4. Update `LaboratoryOrder` detail views to show `sale.sale_number` as primary reference
5. Add `Sale *Sale` to `LaboratoryOrder` domain (already covered in 12-01) — verify frontend receives it

---

## Risks & Gotchas

1. **`product_id` already in DB but not in Go struct.** Migration 000011 creates `product_id` in `sale_items` but `domain.SaleItem` only has `LensID`. Adding `ProductID *uint` to the struct is safe (nullable column, no existing data conflicts). The existing `Product *Product gorm:"foreignKey:LensID"` association must NOT be broken — keep it and add a separate `GenericProduct *Product gorm:"foreignKey:ProductID"` association, or rename it.

2. **GORM AutoMigrate in local dev.** When `APP_ENV=local`, `postgres.Migrate()` runs `db.AutoMigrate()`. Adding fields to domain structs will automatically ALTER TABLE in local. But in staging/production, the SQL migration file is authoritative — ensure the SQL migration matches the struct change exactly.

3. **`UpdateLaboratoryOrderStatus` handler import.** `handler_laboratory.go` currently imports `labsvc` but not `salesvc`. Adding `salesvc` import is safe — no circular dependency since `sale` package does not import `laboratory` package. Verify with `go build` after.

4. **`sale.Service.Update` parameter change risk.** Plan 12-03 calls `h.sale.Update(saleID, salesvc.UpdateInput{Status: "completed"})`. The current `Update` in `sale/service.go` only updates fields that are non-zero — `Status: "completed"` is a non-empty string, so it will work. But verify that other zero fields (Subtotal, Total, etc.) are NOT accidentally zeroed out by the partial-update pattern.

5. **Appointment Update map gap.** `postgres.AppointmentRepository.Update` must include `is_billed`, `billed_at`, `sale_id` in its GORM `Updates(map)` call. If these columns are missing from the map, the appointment billing step will silently do nothing. This is the most likely silent failure point.

6. **`laboratory_id` resolution when `OrderID` is nil.** On the new flow, new sales won't have an `order_id`. The resolution order (D-04) is: explicit `laboratory_id` in request → order's lab → first active lab → skip. The "order's lab" step is only relevant for legacy sales that still pass `order_id`.

7. **Idempotency of lab order creation.** `GetBySaleID` returns `(nil, nil)` if not found. If the sale creation flow is retried (e.g., network timeout), a second lab order might be created. The idempotency check (`GetBySaleID → if not nil, return existing`) must run BEFORE `Create`.

8. **`Sale.LaboratoryOrders []LaboratoryOrder gorm:"-"` is excluded from GORM.** The `Sale` domain has `LaboratoryOrders []LaboratoryOrder gorm:"-"` — GORM ignores this field. If the `CreateSale` response should include the auto-created lab order, the `SaleRepository.GetByID` must be enhanced to manually load `LaboratoryOrders` after fetching the sale. This is cosmetic but important for the frontend to display the linked lab order immediately after sale creation.

---

## Validation Architecture

### Curl commands (after implementation)

**Create a lens sale and verify lab order auto-creation:**
```bash
TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@convision.co","password":"admin123"}' | jq -r .access_token)

# Create sale with lens item
curl -X POST http://localhost:8001/api/v1/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "patient_id": 1,
    "subtotal": 150000,
    "tax": 0,
    "discount": 0,
    "total": 150000,
    "items": [{"lens_id": 1, "name": "Lente monofocal", "quantity": 1, "price": 150000, "total": 150000}],
    "payments": [{"payment_method_id": 1, "amount": 150000}]
  }'
# Expect: sale created + laboratory_orders array in response with 1 item
```

**Create a frame-only sale and verify no lab order:**
```bash
curl -X POST http://localhost:8001/api/v1/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "patient_id": 1,
    "subtotal": 50000,
    "total": 50000,
    "items": [{"product_type": "frame", "name": "Montura titanio", "quantity": 1, "price": 50000, "total": 50000}],
    "payments": [{"payment_method_id": 1, "amount": 50000}]
  }'
# Expect: sale created, laboratory_orders array is empty
```

**Trigger delivered → sale completed sync:**
```bash
# Get the lab order ID from the first sale above (e.g. id=5)
curl -X POST http://localhost:8001/api/v1/laboratory-orders/5/status \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status": "delivered", "notes": "Entregado al paciente"}'
# Then GET the sale
curl http://localhost:8001/api/v1/sales/1 -H "Authorization: Bearer $TOKEN"
# Expect: sale.status == "completed"
```

**Idempotency test — call CreateSale for same sale twice:**
```bash
# Re-call the same sale endpoint to simulate retry
# Expect: second call creates a new sale (new ID), GetBySaleID check prevents duplicate lab order for same sale
```

### Go test stubs

Each plan should have a corresponding `service_test.go`:

```go
// sale/service_test.go (Plan 12-02)
func TestCreateSale_WithLens_CreatesLabOrder(t *testing.T) { ... }
func TestCreateSale_FrameOnly_NoLabOrder(t *testing.T) { ... }
func TestCreateSale_LabOrderExists_IsIdempotent(t *testing.T) { ... }
func TestCreateSale_NoActiveLab_SaleStillCreated(t *testing.T) { ... }
func TestUpdateAppointmentBilling_PaidSale_SetsIsBilled(t *testing.T) { ... }
```

```go
// In handler test (Plan 12-03)
func TestUpdateLaboratoryOrderStatus_Delivered_MarksSaleCompleted(t *testing.T) { ... }
func TestUpdateLaboratoryOrderStatus_Delivered_BalanceNonZero_NoStatusChange(t *testing.T) { ... }
```

### Manual checks

- `GET /api/v1/laboratory-orders/:id` response includes `"sale": {"id":..., "sale_number":"VTA-0001"}` (not null)
- `GET /api/v1/sales/:id` response includes `"laboratory_orders": [{"id":..., "order_number":"LAB-0001"}]` (auto-created)
- Frontend: Navigate to Receptionist → no "Pedidos (ORD)" link in sidebar
- Frontend: LaboratoryOrder detail shows "Venta: VTA-0001" instead of "Orden: ORD-0001"

---

## RESEARCH COMPLETE
