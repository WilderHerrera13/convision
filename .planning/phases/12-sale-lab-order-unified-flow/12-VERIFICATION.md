---
status: gaps_found
phase: 12
checked: 2026-04-24
must_haves_checked: 28
must_haves_passed: 12
---

# Verification: Phase 12 — sale-lab-order-unified-flow

## Summary

Phase 12 is **not complete**. Plans 12-01 and 12-02 have critical implementation gaps — the core orchestration layer (repo injections, domain interface methods, orchestration methods in `sale.Service`) was never actually written into the codebase despite the SUMMARY files claiming completion. Plan 12-03 passed. Plan 12-04 has three failures (route removal, nav link removal, admin detail page fallback).

---

## Must-Have Checks

### Plan 12-01 — Backend Domain & DB

- [x] `domain.SaleItem` struct has `ProductID *uint`, `ProductType string`, `Name string`, `Description string` fields with correct GORM tags
  - `grep "ProductID" convision-api-golang/internal/domain/sale.go` → matches (`ProductID *uint`)
- [✗] `domain.LaboratoryOrderRepository` interface declares `GetBySaleID(saleID uint) (*LaboratoryOrder, error)`
  - `grep "GetBySaleID" convision-api-golang/internal/domain/laboratory.go` → **no match** — method is absent from the interface
- [✗] `domain.LaboratoryRepository` interface declares `GetFirstActive() (*Laboratory, error)`
  - `grep "GetFirstActive" convision-api-golang/internal/domain/laboratory.go` → **no match** — method is absent from the interface
- [✗] Both new interface methods are implemented in `postgres.LaboratoryOrderRepository` and `postgres.LaboratoryRepository`
  - `grep "GetBySaleID\|GetFirstActive" convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go` → **no match** — neither implementation exists
- [x] `sale.ItemInput` DTO carries `ProductID *uint`, `ProductType string`, `Name string`, `Description string`
  - All four fields present in `sale/service.go` ItemInput struct (lines 49–54)
- [x] `sale.Service.Create()` maps the four new fields from `ItemInput` → `domain.SaleItem`
  - Mapping confirmed at lines 201–212 in `sale/service.go`
- [x] GORM AutoMigrate runs at startup and adds columns to `sale_items`
  - `&domain.SaleItem{}` confirmed in `db.go` AutoMigrate call (per plan task 01-G, already present)
- [x] SQL migration file exists with `product_type`, `name`, `description` columns in up; drops in down
  - File `convision-api-golang/db/migrations/platform/000012_sale_item_generic_products.up.sql` exists with correct `ADD COLUMN IF NOT EXISTS` statements
- [✗] `domain.LaboratoryOrder` struct has `Sale *Sale` field with GORM foreignKey tag
  - `grep "Sale \*Sale" convision-api-golang/internal/domain/laboratory.go` → **no match**
- [✗] `withRelations()` in `postgres.LaboratoryOrderRepository` calls `.Preload("Sale")`
  - `grep "Preload.*Sale" convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go` → **no match**; only `Preload("Laboratory")`, `Preload("Patient")`, `Preload("CreatedByUser")`, `Preload("StatusHistory")` are present
- [x] `postgres.AppointmentRepository.Update()` map includes `"billed_at": a.BilledAt`
  - `grep "billed_at" convision-api-golang/internal/platform/storage/postgres/appointment_repository.go` → matches

---

### Plan 12-02 — Sale Service Orchestrator

- [✗] `sale.Service` struct holds `labOrderRepo domain.LaboratoryOrderRepository`, `labRepo domain.LaboratoryRepository`, `appointmentRepo domain.AppointmentRepository`
  - `grep "labOrderRepo\|labRepo\|appointmentRepo" convision-api-golang/internal/sale/service.go` → **no match** — Service struct still has only `saleRepo`, `adjRepo`, `productRepo`, `logger`
- [✗] `sale.NewService()` accepts the three new repo parameters and wires them into the struct
  - `NewService` signature in `sale/service.go` (lines 21–33) still only accepts 4 params: `saleRepo`, `adjRepo`, `productRepo`, `logger`
- [✗] `main.go` passes `laboratoryOrderRepo`, `laboratoryRepo`, `appointmentRepo` to `salesvc.NewService()`
  - `grep "salesvc.NewService" convision-api-golang/cmd/api/main.go` shows: `salesvc.NewService(saleRepo, saleLensAdjRepo, productRepo, logger)` — only 4 arguments
- [✗] `createLabOrderIfNeeded()` implements lens detection, idempotency check, lab resolution, and `LaboratoryOrder` creation
  - `grep "createLabOrderIfNeeded" convision-api-golang/internal/sale/service.go` → **no match**
- [✗] `updateOrderPaymentStatus()` syncs `order.payment_status` when `sale.OrderID != nil`
  - `grep "updateOrderPaymentStatus" convision-api-golang/internal/sale/service.go` → **no match**
- [✗] `updateAppointmentBilling()` sets `is_billed`, `billed_at`, `sale_id` on the linked Appointment
  - `grep "updateAppointmentBilling" convision-api-golang/internal/sale/service.go` → **no match**
- [✗] All three methods are called from `Create()` after `saleRepo.Create(sale)` succeeds
  - No orchestration calls exist after `saleRepo.Create(sale)` at line 250 in `sale/service.go`
- [✗] `CreateInput` has `LaboratoryID *uint` field
  - `grep "LaboratoryID" convision-api-golang/internal/sale/service.go` → **no match** in `CreateInput`

---

### Plan 12-03 — Status Sync

- [x] `UpdateLaboratoryOrderStatus` handler calls `h.sale.GetByID` after successful status update when `input.Status == "delivered"` and `labOrder.SaleID != nil`
  - `grep '"delivered"' convision-api-golang/internal/transport/http/v1/handler_laboratory.go` → matches inside `UpdateLaboratoryOrderStatus`
- [x] If `sale.Balance <= 0`, handler calls `h.sale.Update(saleID, salesvc.UpdateInput{Status: "completed"})`
  - `grep "h.sale.Update" convision-api-golang/internal/transport/http/v1/handler_laboratory.go` → matches with `Status: "completed"`
- [x] A zap log is emitted on each sync attempt (success and skip)
  - `grep "h.logger.Info" convision-api-golang/internal/transport/http/v1/handler_laboratory.go` → matches for both the balance-skip and completion log lines
- [x] No changes to the `laboratory.Service` or its interface — all orchestration stays in the handler layer
  - Confirmed: only `handler_laboratory.go` was modified for this logic
- [x] Build passes: `cd convision-api-golang && go build ./...` → exits 0

---

### Plan 12-04 — Frontend Changes

- [✗] The route `path: "orders"` with `element: <OrderList />` is removed from the receptionist route tree in `App.tsx`
  - `grep "OrderList" convision-front/src/App.tsx` → **matches** at lines 29 and 633; route is still present
- [✗] The `import OrderList from "./pages/receptionist/OrderList"` line is removed from `App.tsx`
  - Still present at line 29 of `App.tsx`
- [x] `laboratoryOrderService.ts` — `LaboratoryOrder.sale` type includes `sale_number: string`
  - `grep "sale_number" convision-front/src/services/laboratoryOrderService.ts` → matches
- [✗] `LaboratoryOrderDetail.tsx` (admin) shows `sale.sale_number` when `sale_id` is set, falling back to `order_number` otherwise
  - `grep "sale_number\|sale?.sale_number" convision-front/src/pages/admin/LaboratoryOrderDetail.tsx` → only `order_number` at line 113; no `sale?.sale_number` fallback pattern
- [x] `LabOrderDetail.tsx` (receptionist) — file does not exist in codebase; plan 12-04 SUMMARY acknowledges this as N/A deviation
- [x] `NewLabOrder.tsx` / `NewLaboratoryOrder.tsx` allows optional `lens_id` (no hard required constraint)
  - Per 12-04 SUMMARY: no hard `lens_id` validation was present — confirmed N/A deviation
- [✗] The Orders navigation link is removed from the admin sidebar in `AdminLayout.tsx`
  - `grep "orders" convision-front/src/layouts/AdminLayout.tsx` → line 81 still has `{ title: 'Órdenes', path: '/receptionist/orders', icon: PackageOpen }` in the sidebar

---

## Requirement Coverage

- **SALE-01** (auto-create LaboratoryOrder when sale has lens items): **NOT MET** — `createLabOrderIfNeeded()` was never implemented; `GetBySaleID`/`GetFirstActive` absent from domain interfaces and implementations; `labOrderRepo`/`labRepo` not injected into `sale.Service`
- **SALE-02** (sync sale status after lab order delivered): **PARTIALLY MET** — the handler-layer sync (plan 12-03) is complete, but the `updateAppointmentBilling` side of billing sync (plan 12-02) was not implemented
- **SALE-03** (update appointment billing when sale created): **NOT MET** — `updateAppointmentBilling()` was never implemented; `appointmentRepo` not injected into `sale.Service`
- **SALE-04** (remove standalone Orders route, show sale_number on lab orders): **PARTIALLY MET** — `laboratoryOrderService.ts` has `sale_number` field; receptionist `LabOrderDetail.tsx` N/A (file absent); but `OrderList` route/import still in `App.tsx`, Orders nav link still in `AdminLayout.tsx`, and admin `LaboratoryOrderDetail.tsx` still uses only `order_number` without `sale_number` fallback

---

## Gaps

### Critical (blocking SALE-01, SALE-02, SALE-03)

1. **`domain.LaboratoryRepository`** is missing `GetFirstActive() (*Laboratory, error)` method in the interface (`convision-api-golang/internal/domain/laboratory.go`)
2. **`domain.LaboratoryOrderRepository`** is missing `GetBySaleID(saleID uint) (*LaboratoryOrder, error)` method in the interface (`convision-api-golang/internal/domain/laboratory.go`)
3. **`domain.LaboratoryOrder`** struct is missing `Sale *Sale` association field (`convision-api-golang/internal/domain/laboratory.go`)
4. **`postgres.LaboratoryRepository`** does not implement `GetFirstActive()` (`convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go`)
5. **`postgres.LaboratoryOrderRepository`** does not implement `GetBySaleID()` (`convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go`)
6. **`postgres.LaboratoryOrderRepository.withRelations()`** does not call `.Preload("Sale")` (`convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go`)
7. **`sale.Service`** struct does not include `labOrderRepo`, `labRepo`, `appointmentRepo` fields (`convision-api-golang/internal/sale/service.go`)
8. **`sale.NewService()`** does not accept `labOrderRepo`, `labRepo`, `appointmentRepo` params (`convision-api-golang/internal/sale/service.go`)
9. **`sale.CreateInput`** does not have `LaboratoryID *uint` field (`convision-api-golang/internal/sale/service.go`)
10. **`sale.Service.createLabOrderIfNeeded()`** was never implemented (`convision-api-golang/internal/sale/service.go`)
11. **`sale.Service.updateOrderPaymentStatus()`** was never implemented (`convision-api-golang/internal/sale/service.go`)
12. **`sale.Service.updateAppointmentBilling()`** was never implemented (`convision-api-golang/internal/sale/service.go`)
13. **`main.go`** still calls `salesvc.NewService` with only 4 args; must pass `laboratoryOrderRepo`, `laboratoryRepo`, `appointmentRepo` (`convision-api-golang/cmd/api/main.go` line 152)

### Non-critical (SALE-04 frontend)

14. **`App.tsx`** still imports `OrderList` (line 29) and has the `path: "orders"` route (line 632–633) — must be removed (`convision-front/src/App.tsx`)
15. **`AdminLayout.tsx`** still has `{ title: 'Órdenes', path: '/receptionist/orders', icon: PackageOpen }` nav item at line 81 — must be removed (`convision-front/src/layouts/AdminLayout.tsx`)
16. **`LaboratoryOrderDetail.tsx` (admin)** still renders only `order.order_number` at line 113; must be updated to `order.sale?.sale_number ?? order.order_number` (`convision-front/src/pages/admin/LaboratoryOrderDetail.tsx`)

---

## Human Verification Items

- After the gaps are fixed, manually test: create a Sale with a lens item → verify a `LaboratoryOrder` is auto-created in the DB with status `pending` and the correct `sale_id`.
- Manually test: mark a `LaboratoryOrder` as `delivered` via the API → verify the linked Sale status becomes `completed` (balance must be 0).
- Manually test: create a Sale linked to an Appointment with `payment_status = paid` → verify the Appointment row has `is_billed = true` and `billed_at` set.
