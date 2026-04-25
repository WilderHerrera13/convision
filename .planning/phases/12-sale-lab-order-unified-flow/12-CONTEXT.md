# Phase 12: Sale → LaboratoryOrder Unified Flow — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Source:** Deep domain discussion with product owner (optical store administrator)

<domain>
## Phase Boundary

This phase unifies the post-consultation commercial flow for an optical store (óptica).
The flow being implemented:

```
Cita (Appointment)
  ↓
Fórmula/Prescripción  ← clinical document from optometrist (already exists)
  ↓
Venta (Sale)           ← receptionist registers items + payment
  ↓ (automatic if lenses present)
Orden de Laboratorio   ← manufacturing + delivery lifecycle (14 stages)
  ↓ (when delivered)
Sale.status = completed
```

**Key business rule clarified:** If a patient buys ONLY frames, accessories, or non-lens products → no LaboratoryOrder is created. The sale is closed immediately when paid. Only sales that include lens items trigger LaboratoryOrder creation.

**The Order entity (ORD-xxx) is being retired.** During analysis it was found that the `Order` entity caused confusion with the optometrist's "fórmula" (prescription). The `Order` does not represent a visible concept for optical store staff — it was an intermediate technical artifact. Its role is fully absorbed by Sale (commercial document) + LaboratoryOrder (operational tracking).

</domain>

<decisions>
## Implementation Decisions

### D-01: SaleItem must support generic products
- **Current state:** `domain.SaleItem` only has `lens_id *uint` — limited to lenses
- **Decision:** Add `product_id *uint`, `product_type string`, `name string`, `description string` to `SaleItem`
- **Migration:** ALTER TABLE `sale_items` ADD COLUMNS `product_id`, `product_type`, `name`, `description`
- **Backward compat:** `lens_id` stays for existing lens-specific items; `product_id` covers frames, accessories

### D-02: Sale.Create() is the orchestration point
- **Decision:** `sale.Service.Create()` is the single orchestrator — mirrors Laravel's `SaleService.createSale()`
- **Inject into sale.Service:** `domain.LaboratoryOrderRepository` (to auto-create lab orders)
- **Inject into sale.Service:** `domain.AppointmentRepository` (to update billing status)
- **Transaction:** All 3 operations (Sale + LaboratoryOrder + Appointment update) happen in one DB transaction

### D-03: Lens detection logic
- A sale "has lenses" if ANY SaleItem satisfies:
  - `item.LensID != nil`, OR
  - `item.ProductType == "lens"`
- If has lenses → auto-create LaboratoryOrder
- If NO lenses → skip LaboratoryOrder, mark Sale as ready to close when paid

### D-04: LaboratoryOrder auto-creation from Sale
- Source of truth: Laravel `LaboratoryOrderService.createLaboratoryOrderFromSale()`
- **Idempotency:** If a LaboratoryOrder already exists for this Sale → return existing, don't duplicate
- **laboratory_id resolution order:**
  1. Explicit `laboratory_id` in Sale create request
  2. `order_id`'s laboratory_id (if Sale references an Order)
  3. First active laboratory in the system (auto-detect fallback)
  4. If none found → log warning, skip lab order (don't fail the sale)
- **patient_id:** taken from Sale.patient_id
- **Initial status:** `pending`
- **created_by:** same user who created the Sale

### D-05: Status sync — LaboratoryOrder delivered → Sale completed
- **Trigger:** `laboratory.Service.UpdateOrderStatus()` called with `status = "delivered"`
- **Action:** If LaboratoryOrder has `sale_id` → load that Sale → if `sale.Balance == 0` → set `sale.status = completed`
- **If balance > 0:** LaboratoryOrder status stays `delivered`; Sale stays as-is (receptionist handles collection)
- **Implementation:** Handler-level orchestration in `handler_laboratory.go` to avoid cross-package service deps

### D-06: Order entity fate
- **Decision:** `Order` is NOT deleted from the DB schema (data may exist, tables stay)
- **Decision:** `Order` is REMOVED from all frontend routes, navigation, and user-visible endpoints
- **Decision:** `GET/POST /api/v1/orders` endpoints are kept for backward compat but not linked from frontend
- **Decision:** `LaboratoryOrder.order_id` FK stays nullable — new lab orders set only `sale_id`, `order_id = null`
- **Rationale:** No production data exists, but keeping the table avoids migration risk; the concept is just hidden from users

### D-07: Appointment billing update
- **Decision:** After creating Sale + LaboratoryOrder, update Appointment billing status
- **Logic (mirrors Laravel SaleService.updateAppointmentBillingStatus):**
  - If `sale.appointment_id != nil` AND `sale.payment_status == "paid"` → `appointment.is_billed = true`
  - If `sale.appointment_id != nil` AND payment partial/pending → `appointment.sale_id = sale.id` but `is_billed = false`
- **Note:** Check if `Appointment` domain model has `is_billed`, `billed_at`, `sale_id` fields — add if missing

### D-08: Order.PaymentStatus sync
- When Sale is created with an `order_id` → update `Order.payment_status = sale.payment_status`
- When a payment is added to a Sale with an `order_id` → same sync
- Mirrors Laravel `SaleService.updateOrderPaymentStatus()`

### D-09: Frontend changes
- **Remove:** Any standalone "Orders (ORD-xxx)" page/navigation link
- **Update:** Sale creation form — `SaleItem` inputs now accept any product (frame, lens, accessory, other)
- **Update:** Sale detail page — show linked LaboratoryOrder inline if it exists
- **Update:** LaboratoryOrder tracker — the `sale` relation is the primary link (not `order`)
- **Keep:** All existing LaboratoryOrder status flow screens — they don't change

### the agent's Discretion
- Exact DB migration syntax (Go uses `docker/docker-compose.yml` with PostgreSQL; check existing migration patterns)
- Whether to use GORM AutoMigrate or manual SQL migrations (follow existing project pattern)
- Error handling strategy when LaboratoryOrder auto-creation fails (sale already committed — should warn but not rollback sale)
- Exact field names for `Appointment.is_billed` — check if this field already exists in Go domain

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Go Backend — Domain Models
- `convision-api-golang/internal/domain/sale.go` — current SaleItem, Sale, SalePayment definitions
- `convision-api-golang/internal/domain/laboratory.go` — LaboratoryOrder, statuses, evidence
- `convision-api-golang/internal/domain/order.go` — Order entity (being retired from UI)
- `convision-api-golang/internal/domain/appointment.go` — check for is_billed fields

### Go Backend — Services (current state to modify)
- `convision-api-golang/internal/sale/service.go` — current Sale.Create() to orchestrate
- `convision-api-golang/internal/laboratory/service.go` — UpdateOrderStatus() to add sync
- `convision-api-golang/internal/order/service.go` — reference for what's being retired

### Go Backend — Handlers
- `convision-api-golang/internal/transport/http/v1/handler_sale.go` — sale HTTP handlers
- `convision-api-golang/internal/transport/http/v1/handler_laboratory.go` — lab order status handler
- `convision-api-golang/internal/transport/http/v1/handler_order.go` — order handlers (to retire)
- `convision-api-golang/internal/transport/http/v1/routes.go` — route registration

### Go Backend — Repositories
- `convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go` — GetBySaleID needed
- `convision-api-golang/internal/platform/storage/postgres/order_repository.go` — reference

### Laravel Reference (source of truth for business logic)
- `convision-api/app/Services/SaleService.php` — createSale() orchestration pattern
- `convision-api/app/Services/LaboratoryOrderService.php` — createLaboratoryOrderFromSale()
- `convision-api/app/Models/Sale.php` — laboratoryOrders() relationship

### Frontend
- `convision-front/src/services/laboratoryOrderService.ts` — API client for lab orders
- `convision-front/src/pages/receptionist/LabOrders.tsx` — receptionist lab order list
- `convision-front/src/pages/admin/LaboratoryOrders.tsx` — admin lab order list

</canonical_refs>

<specifics>
## Specific Implementation Notes

### New `sale.Service` constructor signature
```go
func NewService(
    saleRepo    domain.SaleRepository,
    adjRepo     domain.SaleLensPriceAdjustmentRepository,
    productRepo domain.ProductRepository,
    labRepo     domain.LaboratoryOrderRepository,  // NEW
    appointmentRepo domain.AppointmentRepository,  // NEW
    logger      *zap.Logger,
) *Service
```

### LaboratoryOrder auto-creation — pseudo-code
```go
func (s *Service) createLabOrderIfNeeded(sale *domain.Sale, items []ItemInput, labID *uint, userID uint) {
    hasLens := false
    for _, it := range items {
        if it.LensID != nil || it.ProductType == "lens" {
            hasLens = true
            break
        }
    }
    if !hasLens { return }

    // idempotency: check existing
    existing, _ := s.labRepo.GetBySaleID(sale.ID)
    if existing != nil { return }

    // resolve laboratory_id
    resolvedLabID := resolveLabID(labID, sale.OrderID, s.labRepo)
    if resolvedLabID == nil {
        s.logger.Warn("no laboratory found, skipping lab order", zap.Uint("sale_id", sale.ID))
        return
    }

    lo := &domain.LaboratoryOrder{
        SaleID:       &sale.ID,
        LaboratoryID: resolvedLabID,
        PatientID:    &sale.PatientID,
        Status:       "pending",
        Priority:     "normal",
        CreatedBy:    &userID,
    }
    s.labRepo.Create(lo)
    s.labRepo.AddStatusEntry(&domain.LaboratoryOrderStatusEntry{
        LaboratoryOrderID: lo.ID,
        Status:            "pending",
        Notes:             "Orden creada automáticamente desde venta",
        UserID:            &userID,
    })
}
```

### LaboratoryOrder repository — new method needed
```go
// Add to domain.LaboratoryOrderRepository interface:
GetBySaleID(saleID uint) (*LaboratoryOrder, error)
// Add to domain.LaboratoryOrderRepository interface:
GetFirstActiveLaboratory() (*Laboratory, error)  // fallback for auto-detect
```

### Status sync in handler (handler_laboratory.go)
```go
// After s.laboratory.UpdateOrderStatus(id, input, userID):
if input.Status == "delivered" && labOrder.SaleID != nil {
    sale, err := h.sale.GetByID(*labOrder.SaleID)
    if err == nil && sale.Balance <= 0 {
        h.sale.Update(*labOrder.SaleID, sale.UpdateInput{Status: "completed"})
    }
}
```

</specifics>

<deferred>
## Deferred Ideas

- Real-time notification to patient when LaboratoryOrder reaches `ready_for_delivery` — deferred to notification module
- Multiple LaboratoryOrders per Sale (e.g., patient buys two different pairs of glasses) — deferred; current model assumes one lab order per sale
- Inventory deduction on sale creation (SaleItem quantity → reduce product stock) — commented out in Laravel too, deferred
- Quote → Sale conversion flow — Quote entity exists but Quote→Sale promotion is a separate phase

</deferred>

---
*Phase: 12-sale-lab-order-unified-flow*
*Context gathered: 2026-04-24 via domain discussion with product owner*
