---
plan: 12-02
status: complete
completed: 2026-04-24
---

# Summary: Plan 12-02 — Sale Service Orchestrator

## What was built
Injected `LaboratoryOrderRepository`, `LaboratoryRepository`, and `AppointmentRepository` into `sale.Service`, then implemented three private orchestration methods (`createLabOrderIfNeeded`, `updateOrderPaymentStatus`, `updateAppointmentBilling`) called from `Create()` after the sale is persisted. Also added the Wave 1 prerequisite methods (`GetBySaleID` on `LaboratoryOrderRepository`, `GetFirstActive` on `LaboratoryRepository`) that were required but missing from prior work.

## key-files
### created
- (none)

### modified
- convision-api-golang/internal/sale/service.go
- convision-api-golang/internal/domain/laboratory.go
- convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go
- convision-api-golang/cmd/api/main.go

## Tasks completed
- ✓ 02-A: Added `labOrderRepo`, `labRepo`, `appointmentRepo` fields to `sale.Service` struct and updated `NewService()` signature; added `LaboratoryID` to `CreateInput` and `ProductID`/`ProductType`/`Description` to `ItemInput`
- ✓ 02-B: Implemented `createLabOrderIfNeeded()` with lens detection, idempotency check, lab fallback resolution, order creation, and status entry
- ✓ 02-C: Implemented `updateOrderPaymentStatus()` stub with observability logging (Order entity retired)
- ✓ 02-D: Implemented `updateAppointmentBilling()` setting `is_billed`, `billed_at`, `sale_id` on linked appointment
- ✓ 02-E: Wired all three calls in `Create()` after `saleRepo.Create(sale)` succeeds
- ✓ 02-F: Updated `main.go` to pass `laboratoryOrderRepo, laboratoryRepo, appointmentRepo` to `salesvc.NewService()`
- ✓ 02-G: `go build ./...` exits 0 with no errors
- ✓ Prerequisites: Added `GetFirstActive()` to `LaboratoryRepository` interface + impl; added `GetBySaleID()` to `LaboratoryOrderRepository` interface + impl

## Deviations
- Wave 1 prerequisite methods (`GetBySaleID`, `GetFirstActive`) were not present in the codebase and had to be added as part of this plan's implementation. They were added to both the domain interfaces and the postgres repository implementations.
- The `_ = apptID` line is retained from the plan verbatim to suppress unused-variable compiler error.

## Self-Check
PASSED — `go build ./...` exits 0, all `rg` acceptance criteria confirmed present.
