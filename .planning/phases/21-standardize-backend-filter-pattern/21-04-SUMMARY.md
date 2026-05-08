---
phase: 21-standardize-backend-filter-pattern
plan: 04
subsystem: api
tags: [go, gorm, gin, filter-structs, sale, quote, order, mocks]

requires:
  - phase: 21-01
    provides: domain.Pagination struct + canonical Filter pattern documentation
  - phase: 21-02
    provides: RoleFilter / NotificationFilter reference template
  - phase: 21-03
    provides: Inventory module Filter migration template

provides:
  - SaleFilter, QuoteFilter, OrderFilter typed structs end-to-end
  - Sale, Quote, Order list endpoints fully migrated to typed Filter + ShouldBindQuery
  - All three repository mocks updated to typed signatures

affects: [21-05, 21-06, 21-07, 21-08, 21-09, 21-10]

tech-stack:
  added: []
  patterns:
    - "All commercial-flow list endpoints (sale, quote, order) use typed Filter + ShouldBindQuery"
    - "BranchID injected post-bind on sales handler (with admin override support preserved)"

key-files:
  created: []
  modified:
    - convision-api-golang/internal/domain/sale.go
    - convision-api-golang/internal/domain/quote.go
    - convision-api-golang/internal/domain/order.go
    - convision-api-golang/internal/platform/storage/postgres/sale_repository.go
    - convision-api-golang/internal/platform/storage/postgres/quote_repository.go
    - convision-api-golang/internal/platform/storage/postgres/order_repository.go
    - convision-api-golang/internal/sale/service.go
    - convision-api-golang/internal/quote/service.go
    - convision-api-golang/internal/order/service.go
    - convision-api-golang/internal/transport/http/v1/handler_sale.go
    - convision-api-golang/internal/transport/http/v1/handler_quote.go
    - convision-api-golang/internal/transport/http/v1/handler_order.go
    - convision-api-golang/internal/testutil/mocks/sale_repo.go
    - convision-api-golang/internal/testutil/mocks/quote_repo.go
    - convision-api-golang/internal/testutil/mocks/order_repo.go

key-decisions:
  - "Bundled all 5 tasks into ONE compound commit. Confirmed via stash test: any partial split leaves HEAD uncompilable because the Repository interface change in domain forces matching impls in repos+mocks AND every consumer (services), AND service signature change in turn forces handler updates. Previous plans (21-02, 21-03) used 3 compound commits because they had more independent logical chunks. 21-04 has no such breakable chunks: 3 tightly coupled modules of 5 files each"
  - "Removed local clampPage helpers from sale/service.go and quote/service.go since f.Clamp() now handles bounds via embedded Pagination; order/service.go inlined the same logic and got the same treatment"
  - "Sale handler keeps the resolveBranchOverride admin escape-hatch: BranchID assigned via *uint after ShouldBindQuery, preserving the override-to-zero semantics used by admin global view"

patterns-established:
  - "When the entire Filter migration of a module is small (≤5 files per layer × 3 modules) and tightly coupled, a single compound commit is acceptable and strictly necessary to keep HEAD compilable"
  - "SaleFilter.UserID maps to created_by (same convention as future Quote/Order audit-log filters)"

requirements-completed: [FILTER-01, FILTER-02, FILTER-03, FILTER-04, FILTER-05]

duration: 8min
completed: 2026-05-08
---

# Phase 21-04: Commercial Flow Filters — sale, quote, order Summary

**Migrated the Sale, Quote, and Order list endpoints from `map[string]any + page/perPage` to typed `SaleFilter`, `QuoteFilter`, `OrderFilter` structs end-to-end across domain, repository, service, handler, and mock layers — all `*FilterAllowlist` maps removed, all three handlers now use `c.ShouldBindQuery`.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-08T23:42:35Z (resumed from 21-03 completion)
- **Completed:** 2026-05-08
- **Tasks:** 5 (committed as 1 compound commit)
- **Files modified:** 15

## Accomplishments

- 3 typed Filter structs (`SaleFilter`, `QuoteFilter`, `OrderFilter`) added to their respective `internal/domain/` files, each embedding `domain.Pagination`.
- 3 Repository interface `List` signatures migrated from `(filters map[string]any, page, perPage int)` to typed Filter structs.
- 3 PostgreSQL repository implementations rewritten with explicit nil-checked field handling. All `saleFilterAllowlist`, `quoteFilterAllowlist`, `orderFilterAllowlist` removed. Sale repo preserves `withRelations` Preload chain; Quote repo preserves Patient/CreatedByUser/Items preload; Order repo preserves laboratory + patient + items preload + the `Select("orders.*")` guard.
- 3 service `List` methods (`sale.Service`, `quote.Service`, `order.Service`) converted to typed Filter inputs. `clampPage` helper removed from sale and quote services (redundant with `f.Clamp()`); same logic inlined-and-removed from order service.
- 3 handler `List*` methods (`ListSales`, `ListQuotes`, `ListOrders`) converted to `c.ShouldBindQuery(&f)`. Sale handler keeps the admin-override branch logic (`resolveBranchOverride`) and assigns `*BranchID` post-bind.
- 3 mocks (`MockSaleRepository.List`, `MockQuoteRepository.List`, `MockOrderRepository.List`) updated to typed signatures.
- `go build ./...` clean. Pre-existing `internal/inventory/service_test.go` vet failure is unchanged (tracked for Phase 22).

## Task Commits

1. **T1+T2+T3+T4+T5: Full migration (domain + repos + services + handlers + mocks)** — `784465b` (refactor)

## Files Created/Modified

- `internal/domain/sale.go` — added `SaleFilter`; `SaleRepository.List` typed
- `internal/domain/quote.go` — added `QuoteFilter`; `QuoteRepository.List` typed
- `internal/domain/order.go` — added `OrderFilter`; `OrderRepository.List` typed
- `internal/platform/storage/postgres/sale_repository.go` — `saleFilterAllowlist` removed; typed List
- `internal/platform/storage/postgres/quote_repository.go` — `quoteFilterAllowlist` removed; typed List
- `internal/platform/storage/postgres/order_repository.go` — `orderFilterAllowlist` removed; typed List
- `internal/sale/service.go` — typed `List(f SaleFilter)`; `clampPage` removed
- `internal/quote/service.go` — typed `List(db, f QuoteFilter)`; `clampPage` removed
- `internal/order/service.go` — typed `List(db, f OrderFilter)`; inline pagination logic via `f.Clamp()`
- `internal/transport/http/v1/handler_sale.go` — `ShouldBindQuery`; preserves `resolveBranchOverride` admin pathway
- `internal/transport/http/v1/handler_quote.go` — `ShouldBindQuery`; `strconv` import dropped
- `internal/transport/http/v1/handler_order.go` — `ShouldBindQuery`
- `internal/testutil/mocks/sale_repo.go` — typed mock
- `internal/testutil/mocks/quote_repo.go` — typed mock
- `internal/testutil/mocks/order_repo.go` — typed mock

## Decisions Made

- **Single compound commit instead of three** — verified via `git stash` of just the handler files that any non-trivial partial commit leaves HEAD uncompilable (handlers reference old service signatures; services reference old repo signatures). Unlike 21-02 / 21-03 where logical chunks (e.g., role first, then notification) were independently compilable, 21-04 has no such breakable chunks across its 3 tightly coupled modules.
- **clampPage helpers removed** — embedded `Pagination.Clamp()` is now the single source of truth for bounds. Leaving unused helpers would have produced lint warnings.
- **Sale BranchID via override-aware injection** — preserved the existing admin override pattern (`resolveBranchOverride` + `branchmw.BranchIDFromCtx`) by assigning `*BranchID` after `ShouldBindQuery`. This keeps the `branch_id=0 → admin sees all branches` semantics working untouched.

## Deviations from Plan

None - plan executed exactly as written, with the documented compound-commit decision matching the 21-02 / 21-03 precedent.

## Issues Encountered

- Pre-existing `internal/inventory/service_test.go:41` vet failure (calls `svc.CreateTransfer` with one argument; signature requires two) remains unchanged. Documented in 21-02 and 21-03 summaries; will be addressed when phase 22 (test coverage) starts. Does not block plan completion (`go build ./...` passes; only `go vet ./...` and tests in that one package fail).

## Next Phase Readiness

- Wave 2 complete (21-03 inventory + 21-04 commercial flow). 4 of 10 plans done in Phase 21.
- Pattern is now proven across small (Role, Notification), large (inventory — 7 filters), and medium (commercial flow — 3 filters) domains.
- 21-05 can begin immediately. No blockers.
