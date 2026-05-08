---
phase: 21-standardize-backend-filter-pattern
plan: 05
subsystem: api
tags: [go, gorm, gin, filter-structs, finance, cash, payroll, expense, purchase, cashclose]

requires:
  - phase: 21-01
    provides: domain.Pagination struct + canonical Filter pattern documentation
  - phase: 21-02
    provides: RoleFilter / NotificationFilter reference template
  - phase: 21-03
    provides: Inventory module Filter migration template
  - phase: 21-04
    provides: Sale/Quote/Order Filter migration template + compound-commit precedent

provides:
  - PayrollFilter, ServiceOrderFilter, ExpenseFilter typed structs (internal/domain/finance.go)
  - CashTransferFilter, CashRegisterCloseFilter typed structs (internal/domain/cash.go)
  - PurchaseFilter typed struct (internal/domain/purchase.go)
  - Six finance/cash list endpoints fully migrated to typed Filter + ShouldBindQuery
  - CashRegisterCloseRepository.List signature with typed Role + userID for explicit RBAC
  - Mocks updated for Expense, Payroll, ServiceOrder, Purchase, CashRegisterClose

affects: [21-06, 21-07, 21-08, 21-09, 21-10]

tech-stack:
  added: []
  patterns:
    - "All finance/cash list endpoints (payroll, service order, cash transfer, expense, purchase, cash register close) use typed Filter + ShouldBindQuery"
    - "RBAC parameters (role, userID) stay as explicit Repository.List arguments separate from the Filter struct — they are access control, not query filters"
    - "Service.List signatures collapse from (db, filters map, page, perPage) to (db, FilterStruct), with f.Clamp() centralizing pagination bounds"

key-files:
  created: []
  modified:
    - convision-api-golang/internal/domain/finance.go
    - convision-api-golang/internal/domain/cash.go
    - convision-api-golang/internal/domain/purchase.go
    - convision-api-golang/internal/platform/storage/postgres/payroll_repository.go
    - convision-api-golang/internal/platform/storage/postgres/service_order_repository.go
    - convision-api-golang/internal/platform/storage/postgres/cash_transfer_repository.go
    - convision-api-golang/internal/platform/storage/postgres/expense_repository.go
    - convision-api-golang/internal/platform/storage/postgres/purchase_repository.go
    - convision-api-golang/internal/platform/storage/postgres/cash_register_close_repository.go
    - convision-api-golang/internal/payroll/service.go
    - convision-api-golang/internal/serviceorder/service.go
    - convision-api-golang/internal/cash/service.go
    - convision-api-golang/internal/cashclose/service.go
    - convision-api-golang/internal/expense/service.go
    - convision-api-golang/internal/purchase/service.go
    - convision-api-golang/internal/transport/http/v1/handler_t9.go
    - convision-api-golang/internal/transport/http/v1/handler_finance.go
    - convision-api-golang/internal/transport/http/v1/handler_cash_register_close.go
    - convision-api-golang/internal/testutil/mocks/expense_repo.go
    - convision-api-golang/internal/testutil/mocks/cashclose_repo.go
    - convision-api-golang/internal/testutil/mocks/supplier_repo.go

key-decisions:
  - "Single compound commit for all 6 tasks — 21 files across domain, repos, services, handlers, mocks. Mirrors 21-04 precedent: any partial split leaves HEAD uncompilable because Repository interface changes force matching repo impls, mocks, services, AND handlers simultaneously"
  - "CashRegisterCloseRepository.List keeps role and userID as explicit params (typed domain.Role) instead of cramming them into the Filter struct — they are access control, not query parameters. Repo applies user_id scoping only when role != RoleAdmin"
  - "Cashclose Consolidated method (admin-only aggregation) uses typed CashRegisterCloseFilter with explicit RoleAdmin + userID=0 so the repo skips the role-scoping branch"
  - "Updated MockPurchaseRepository in testutil/mocks/supplier_repo.go (PurchaseRepository mock lives there) plus MockCashTransferRepository did not need updating since no mock exists for it yet"

patterns-established:
  - "When Filter migration touches a Repository interface that participates in RBAC (cash register close), keep role/userID as separate explicit args — not Filter fields"
  - "Compound-commit precedent reaffirmed: small Filter migrations can stage partial commits, but full repository-interface flips require atomic commits to keep HEAD compilable"

requirements-completed: [FILTER-01, FILTER-02, FILTER-03, FILTER-04, FILTER-05]

duration: 12min
completed: 2026-05-08
---

# Phase 21-05: Finance + Cash Close Filters Summary

**Migrated six finance/cash domains (Payroll, ServiceOrder, CashTransfer, Expense, Purchase, CashRegisterClose) from `map[string]any` allowlists and ad-hoc `c.Query()` calls to typed Filter structs end-to-end — removing 5 `*FilterAllowlist` maps, all `parseApiFilters` calls in handler_t9.go and handler_finance.go (scope), and the entire ad-hoc query-extraction block in handler_cash_register_close.go.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-08 (resumed from 21-04 completion)
- **Completed:** 2026-05-08
- **Tasks:** 6 (committed as 1 compound commit)
- **Files modified:** 21

## Accomplishments

- 6 typed Filter structs added to their respective `internal/domain/` files, each embedding `domain.Pagination`:
  - `PayrollFilter`, `ServiceOrderFilter`, `ExpenseFilter` in `finance.go`
  - `CashTransferFilter`, `CashRegisterCloseFilter` in `cash.go`
  - `PurchaseFilter` in `purchase.go`
- 6 Repository interface `List` signatures migrated from `(filters map[string]any, page, perPage int)` to typed Filter structs.
  - `CashRegisterCloseRepository.List` keeps `role domain.Role, userID uint` as explicit access-control params (not Filter fields).
- 6 PostgreSQL repository implementations rewritten with explicit nil-checked field handling. All `*FilterAllowlist` maps removed (`payrollFilterAllowlist`, `serviceOrderFilterAllowlist`, `cashTransferFilterAllowlist`, `expenseFilterAllowlist`, `purchaseFilterAllowlist`, `cashRegisterCloseFilterAllowlist`). Existing `withRelations` Preload chains for Expense and Purchase preserved.
- 6 service `List` methods (`payroll.Service`, `serviceorder.Service`, `cash.Service`, `expense.Service`, `purchase.Service`, `cashclose.Service`) converted to typed Filter inputs. Inline `if page < 1 { page = 1 }` / `if perPage > 100` clamps removed in favor of `f.Clamp()`.
- 6 internal `s.repo.List(db, map[string]any{}, …)` callers (stats methods + counter queries in serviceorder.Create / cash.Create + Consolidated cashclose method) replaced with empty typed filters.
- 5 handler `List*` methods converted to `c.ShouldBindQuery(&f)`:
  - `ListPayrolls`, `ListServiceOrders`, `ListCashTransfers` in `handler_t9.go`
  - `ListPurchases`, `ListExpenses` in `handler_finance.go`
  - `ListCashRegisterCloses` in `handler_cash_register_close.go` (preserves admin branch override via `resolveBranchOverride` after bind)
- 5 mocks updated to typed signatures:
  - `MockExpenseRepository`, `MockPayrollRepository`, `MockServiceOrderRepository` in `expense_repo.go`
  - `MockCashRegisterCloseRepository` in `cashclose_repo.go`
  - `MockPurchaseRepository` in `supplier_repo.go`
- `make build` passes clean. `make test` shows the same pre-existing `internal/inventory/service_test.go:36` build failure documented in 21-04 (unchanged; unrelated to this plan).

## Task Commits

1. **T1+T2+T3+T4+T5+T6: Full migration (domain + repos + services + handlers + mocks)** — `d99508a` (refactor)

## Files Created/Modified

- `internal/domain/finance.go` — added `PayrollFilter`, `ServiceOrderFilter`, `ExpenseFilter`; 3 Repository.List signatures typed
- `internal/domain/cash.go` — added `CashTransferFilter`, `CashRegisterCloseFilter`; 2 Repository.List signatures typed (CashRegisterCloseRepository.List keeps role/userID)
- `internal/domain/purchase.go` — added `PurchaseFilter`; PurchaseRepository.List typed
- `internal/platform/storage/postgres/payroll_repository.go` — `payrollFilterAllowlist` removed; typed List with UserID/Status/FromDate/ToDate
- `internal/platform/storage/postgres/service_order_repository.go` — `serviceOrderFilterAllowlist` removed; typed List with PatientID/Status/ServiceTypeID/UserID
- `internal/platform/storage/postgres/cash_transfer_repository.go` — `cashTransferFilterAllowlist` removed; typed List with Status/Type
- `internal/platform/storage/postgres/expense_repository.go` — `expenseFilterAllowlist` removed; typed List with SupplierID/Status/PaymentMethodID + withRelations preserved
- `internal/platform/storage/postgres/purchase_repository.go` — `purchaseFilterAllowlist` removed; typed List + withRelations preserved
- `internal/platform/storage/postgres/cash_register_close_repository.go` — `cashRegisterCloseFilterAllowlist` removed; typed List with role-scoped access control + DateFrom/DateTo as DATE() comparisons
- `internal/payroll/service.go` — typed `List(db, f PayrollFilter)`; stats query uses typed empty filter
- `internal/serviceorder/service.go` — typed `List(db, f ServiceOrderFilter)`; stats + order-counter queries use typed empty filter
- `internal/cash/service.go` — typed `List(db, f CashTransferFilter)`; stats + transfer-counter queries use typed empty filter
- `internal/cashclose/service.go` — typed `List(db, f CashRegisterCloseFilter, role, userID)`; Consolidated method passes RoleAdmin + 0 userID via typed filter
- `internal/expense/service.go` — typed `List(db, f ExpenseFilter)`; stats query uses typed empty filter
- `internal/purchase/service.go` — typed `List(db, f PurchaseFilter)`
- `internal/transport/http/v1/handler_t9.go` — 3 `ShouldBindQuery` handlers; domain import added
- `internal/transport/http/v1/handler_finance.go` — 2 `ShouldBindQuery` handlers (Suppliers still uses parseApiFilters — out of 21-05 scope, will be addressed in 21-06)
- `internal/transport/http/v1/handler_cash_register_close.go` — `ShouldBindQuery` + admin branch override post-bind
- `internal/testutil/mocks/expense_repo.go` — typed mock signatures for Expense, Payroll, ServiceOrder
- `internal/testutil/mocks/cashclose_repo.go` — typed mock signature for CashRegisterClose
- `internal/testutil/mocks/supplier_repo.go` — typed mock signature for Purchase

## Decisions Made

- **Single compound commit instead of six** — same reasoning as 21-04: Repository interface changes force matching repository impls, mocks, services, AND handlers all in one go. Any partial split leaves HEAD uncompilable.
- **Role + userID stay as explicit Repository.List args** — `CashRegisterCloseRepository.List(db, f, role, userID)` keeps RBAC concerns separate from query filters. The Filter struct uses `BranchID *uint \`form:"-"\`` (middleware-injected, never user-supplied), and role/userID flow through as positional args.
- **Cashclose.Consolidated bypasses role scoping by passing RoleAdmin** — the consolidated view is admin-only and aggregates across all advisors. Passing `domain.RoleAdmin, 0` makes that intent explicit at the call site.
- **`MockCashTransferRepository` not updated** — no such mock exists yet (no test depends on it). Only mocks that already existed got updated.

## Deviations from Plan

None - plan executed exactly as written, with the documented compound-commit decision matching the 21-02/21-03/21-04 precedent.

## Issues Encountered

- Pre-existing `internal/inventory/service_test.go:36` build failure (calls `svc.CreateTransfer` with one argument; signature requires two) is still present. Documented in 21-02, 21-03, and 21-04 summaries; will be addressed when phase 22 (test coverage) starts. Does not block plan completion (`make build` passes clean; only the inventory test package fails to compile).

## Next Phase Readiness

- Wave 3 complete (21-05 finance + cash close). 5 of 10 plans done in Phase 21.
- Pattern is now proven across small (Role, Notification), large (inventory — 7 filters), medium-coupled (commercial flow — 3 filters), and large with explicit RBAC (finance + cash close — 6 filters with role-scoped repo).
- 21-06 can begin immediately. No blockers.
