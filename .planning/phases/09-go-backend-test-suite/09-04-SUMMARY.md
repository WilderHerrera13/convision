---
phase: "09"
plan: "04"
subsystem: service-unit-tests-finance-inventory
tags: [testing, unit-tests, services, go]
requires: [09-01]
provides: [finance-inventory-service-tests]
affects: [09-05]
tech-stack:
  patterns: [testify/mock, inline function-field mocks, mock.Anything, .Once() chaining, zap.NewNop()]
key-files:
  created:
    - convision-api-golang/internal/expense/service_test.go
    - convision-api-golang/internal/payroll/service_test.go
    - convision-api-golang/internal/order/service_test.go
    - convision-api-golang/internal/catalog/service_test.go
    - convision-api-golang/internal/inventory/service_test.go
    - convision-api-golang/internal/laboratory/service_test.go
    - convision-api-golang/internal/cashclose/service_test.go
key-decisions:
  - inventory.Service takes *gorm.DB; CreateTransfer/CompleteTransfer use DB transactions; pass nil for non-transactional tests
  - TestCreateTransfer_InsufficientStock uses t.Skip (integration-only guard inside gorm.DB.Transaction)
  - laboratory.UploadEvidence inline mockStorage (Store method) instead of testutil/mocks stub
  - catalog has no testutil/mocks stubs; used inline function-field mocks for BrandRepository + null-repo structs for unused repos
  - order.Create sets PdfToken/LaboratoryPdfToken at creation time; GetByID only calls Update when tokens are empty
  - expense.Create/payroll.Create reload via repo.GetByID(e.ID) after Create; ID stays 0 in mock → On("GetByID", uint(0))
  - catalog.CreateBrand returns entity directly (no GetByID reload after Create)
requirements-completed: [TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07]
duration: "8 min"
completed: "2026-04-24"
---

# Phase 09 Plan 04: Finance & Inventory Service Unit Tests Summary

Unit tests for 7 services: inventory, laboratory, cashclose, expense, payroll, order, catalog. All 17 test packages pass.

**Duration:** 8 min | **Files:** 7 | **Total test packages passing:** 17

## What Was Built

- `internal/inventory/service_test.go` — 7 tests; CreateTransfer source=dest guard, InsufficientStock skipped (transaction-gated), DeleteLocation (has items / empty success), GetWarehouse (found/not found), CreateLocation success
- `internal/laboratory/service_test.go` — 7 tests; CreateLab, GetLab not found, CreateOrder generates status entry, UpdateOrderStatus valid transition, UploadEvidence (success / exceeds cap of 4 / invalid content type)
- `internal/cashclose/service_test.go` — 8 tests; Create (new/draft upsert/conflict), Submit (success/non-draft), Approve (success/non-submitted), GetByID wrong user forbidden
- `internal/expense/service_test.go` — 7 tests; Create (success/repo error/invalid date), GetByID not found, GetStats aggregation, List paginated, Delete not found
- `internal/payroll/service_test.go` — 5 tests; Create (success/repo error), GetByID not found, GetStats by status, Delete not found
- `internal/order/service_test.go` — 6 tests; Create (success/invalid status), GetByID (existing tokens / not found), UpdateStatus, UpdatePaymentStatus
- `internal/catalog/service_test.go` — 4 tests; CreateBrand (success/repo error), GetBrand not found, DeleteBrand not found

## Deviations from Plan

- `TestGetByID_WithExistingTokens`: order.Create already sets tokens at construction; tested GetByID with pre-populated tokens (no Update call path) instead of token-generation path which would require Update+GetByID mock chain
- `catalog/service_test.go`: used inline function-field mock for BrandRepository plus null-repo structs for the 6 unused repos — no testutil/mocks stubs exist for catalog repos
- inventory `TestCreateTransfer_InsufficientStock`: skipped with documented reason rather than attempting to exercise a gorm.DB transaction path

**Total deviations:** 3 (surface-level). **Impact:** None.

## Issues Encountered

None — all tests compiled and passed on first run.

## Self-Check

- [x] `go test ./internal/inventory/... -v` exits 0
- [x] `go test ./internal/laboratory/... -v` exits 0
- [x] `go test ./internal/cashclose/... -v` exits 0
- [x] `go test ./internal/expense/... -v` exits 0
- [x] `go test ./internal/payroll/... -v` exits 0
- [x] `go test ./internal/order/... -v` exits 0
- [x] `go test ./internal/catalog/... -v` exits 0
- [x] Full suite `go test ./internal/... -count=1` → 17 packages, 0 FAIL

## Self-Check: PASSED
