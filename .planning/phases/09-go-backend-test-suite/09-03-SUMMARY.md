---
phase: "09"
plan: "03"
subsystem: service-unit-tests-commercial
tags: [testing, unit-tests, services, go]
requires: [09-01]
provides: [commercial-service-tests]
affects: [09-05]
tech-stack:
  patterns: [testify/mock, mock.Anything, .Once() chaining, zap.NewNop()]
key-files:
  created:
    - convision-api-golang/internal/discount/service_test.go
    - convision-api-golang/internal/product/service_test.go
    - convision-api-golang/internal/quote/service_test.go
    - convision-api-golang/internal/sale/service_test.go
key-decisions:
  - GetBestDiscount calls GetActiveForProduct (not GetBestForProduct) — mock set up accordingly
  - mock.AssertExpectations is not a free function; called as repo.AssertExpectations(t)
  - domain.QuoteStatusSent does not exist; used QuoteStatusApproved for UpdateStatus transition test
  - RemovePayment makes 3 sequential GetByID calls; used .Once() chaining for all three
  - derivePaymentStatus is unexported — tested indirectly through Create and AddPayment
requirements-completed: [TEST-01, TEST-02, TEST-03, TEST-04, TEST-05]
duration: "5 min"
completed: "2026-04-24"
---

# Phase 09 Plan 03: Commercial Service Unit Tests Summary

Unit tests for 4 commercial domain services: discount, product, quote, sale. All tests pass.

**Duration:** 5 min | **Tasks:** 4 | **Files:** 4 | **Test functions:** 33 total

**Next:** Ready for Wave 2 plan 09-04 (finance & inventory service tests)

## What Was Built

- `internal/discount/service_test.go` — 8 tests; Approve/Reject state guards, GetBestDiscount with active discounts and empty list
- `internal/product/service_test.go` — 9 tests; CalculatePrice (no discount → full price, 20% discount → 80.0), Create zero-price validation
- `internal/quote/service_test.go` — 7 tests; ConvertToSale verified both repos called; Create invalid date → ErrValidation
- `internal/sale/service_test.go` — 9 tests; payment status derivation (pending/paid/partial), AddPayment recalculation, Cancel, adjusted price too low → ErrValidation, RemovePayment 3-call mock chain

## Deviations from Plan

- `TestGetBestDiscount_NoneAvailable`: plan said assert `*domain.ErrNotFound`; `GetBestDiscount` calls `GetActiveForProduct` and returns `(nil, nil)` when slice is empty — test asserts nil discount, nil error
- `TestUpdateStatus_ValidTransition`: used "approved" status instead of "sent" (domain has no QuoteStatusSent constant)
- `mock.AssertExpectations` free function: replaced with `repo.AssertExpectations(t)` pattern throughout

**Total deviations:** 3 (all surface-level, not behavioral). **Impact:** None.

## Issues Encountered

None.

## Self-Check

- [x] `go test ./internal/discount/... -v` exits 0, all 8 tests PASS
- [x] `go test ./internal/product/... -v` exits 0, all 9 tests PASS
- [x] `go test ./internal/quote/... -v` exits 0, all 7 tests PASS
- [x] `go test ./internal/sale/... -v` exits 0, all 9 tests PASS
- [x] `TestApprove_Success`, `TestApprove_NonPendingRejected`, `TestReject_Success` present in discount/service_test.go
- [x] `TestCalculatePrice_WithActiveDiscount`, `TestCalculatePrice_NoDiscount` present in product/service_test.go
- [x] `TestConvertToSale_Success`, `TestConvertToSale_QuoteNotFound` present in quote/service_test.go with AssertExpectations calls
- [x] `TestAddPayment_UpdatesPaymentStatus`, `TestAddPayment_SaleNotFound`, `TestCancel_SetsStatusCancelled`, `TestCreateLensPriceAdjustment_PriceTooLow` present in sale/service_test.go
- [x] 4 commits, one per service

## Self-Check: PASSED
