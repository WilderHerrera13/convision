---
phase: 21-standardize-backend-filter-pattern
plan: 06
subsystem: api
tags: [go, gorm, gin, filter-structs, laboratory, portfolio]

requires:
  - phase: 21-01
    provides: domain.Pagination struct + canonical Filter pattern documentation

provides:
  - LaboratoryFilter typed struct (internal/domain/laboratory.go)
  - LaboratoryOrderFilter typed struct (internal/domain/laboratory.go)
  - Replacement of `_search` pseudo-key with explicit `Search` field (ILIKE on order_number + patient name)
  - Replacement of `_assigned_uid` pseudo-key with explicit `AssignedSpecialistID *uint` field
  - LaboratoryRepository.List + LaboratoryOrderRepository.List signatures migrated to typed Filter
  - ListLaboratories + ListLaboratoryOrders handlers using ShouldBindQuery
  - ListPortfolioOrders service migrated to construct typed LaboratoryOrderFilter (Status=portfolio)
  - Mocks updated for both LaboratoryRepository and LaboratoryOrderRepository

affects: [21-07, 21-08, 21-09, 21-10]

tech-stack:
  added: []
  patterns:
    - "Internal pseudo-keys (`_search`, `_assigned_uid`) injected via map[string]any are replaced with explicit named fields on the typed Filter struct"
    - "Branch text resolution stays in the handler — `Branch string \\`form:\"-\"\\`` is set after ShouldBindQuery from branch_id -> branch.Name lookup"
    - "Service-level callers (ListPortfolioOrders) construct the typed Filter directly instead of staging filters as map keys"

key-files:
  created: []
  modified:
    - convision-api-golang/internal/domain/laboratory.go
    - convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go
    - convision-api-golang/internal/laboratory/service.go
    - convision-api-golang/internal/transport/http/v1/handler_laboratory.go
    - convision-api-golang/internal/testutil/mocks/laboratory_repo.go

key-decisions:
  - "Single compound commit (5 files) — Repository interface flip forces repo impl + service + handler + mock to land together to keep HEAD compilable. Mirrors 21-04 / 21-05 precedent."
  - "Branch column stores TEXT not branch_id, so the handler keeps the branch_id -> branch.Name lookup post-bind. The Filter struct exposes `Branch string` with `form:\"-\"` so it cannot be set directly from the URL."
  - "LaboratoryOrderFilter.AssignedSpecialistID is `*uint` (was a `_assigned_uid string` pseudo-key in the old map). The form tag is `assigned_uid` to match the existing frontend query param name."
  - "ListPortfolioOrders preserves its (db, page, perPage, search) external signature but internally constructs a typed LaboratoryOrderFilter — no breaking change to handler_portfolio.go."

patterns-established:
  - "Pseudo-key migration template: when a `_xxx` map key carried complex SQL (ILIKE join, subquery, ID match), promote it to an explicit named field on the Filter struct. The repo branches on the typed field; the handler binds it via ShouldBindQuery (or sets it post-bind for derived fields like Branch)."

requirements-completed: [FILTER-01, FILTER-02, FILTER-03, FILTER-04, FILTER-05]

duration: 8min
completed: 2026-05-08
---

# Phase 21-06: Laboratory Filters Summary

**Migrated the laboratory and laboratory_order list endpoints from `map[string]any` allowlists with two internal pseudo-keys (`_search`, `_assigned_uid`) to fully typed Filter structs with explicit named fields — closing the special-key loophole that bypassed the canonical pattern.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 6 (committed as 1 compound commit)
- **Files modified:** 5

## Accomplishments

- `LaboratoryFilter` (Status) and `LaboratoryOrderFilter` (PatientID, LaboratoryID, Status, Priority, AssignedSpecialistID, Branch, Search) added to `internal/domain/laboratory.go`, both embedding `domain.Pagination`.
- `laboratoryFilterAllowlist` and `laboratoryOrderFilterAllowlist` deleted from the repository file.
- The `_search` SQL — `order_number ILIKE ? OR patient_id IN (SELECT id FROM patients WHERE CONCAT(first_name, ' ', last_name) ILIKE ?)` — is now triggered by the typed `Search` field.
- The `_assigned_uid` SQL — `assigned_specialist_id = ?` — is now triggered by the typed `AssignedSpecialistID *uint` field.
- `LaboratoryRepository.List(db, f LaboratoryFilter)` and `LaboratoryOrderRepository.List(db, f LaboratoryOrderFilter)` are the new typed signatures.
- `Service.ListLabs` and `Service.ListOrders` now take typed Filter inputs; inline `if page < 1 ...` clamps removed in favor of `f.Clamp()`.
- `Service.ListPortfolioOrders` keeps its external `(db, page, perPage, search)` signature but internally builds a typed `LaboratoryOrderFilter{Status: portfolio, Search: search}` — no API change to `handler_portfolio.go`.
- `ListLaboratories` and `ListLaboratoryOrders` handlers use `c.ShouldBindQuery(&f)`. The `branch_id -> branch.Name` resolution stays in the handler and writes to `f.Branch` post-bind.
- `MockLaboratoryRepository.List` and `MockLaboratoryOrderRepository.List` mock signatures updated to typed Filter structs.
- `make build` passes clean. `go test ./internal/laboratory/...` passes. The pre-existing `internal/inventory/service_test.go:36` build failure is still present (documented in 21-02 through 21-05; unrelated to this plan).

## Task Commits

1. **T1+T2+T3+T4+T5+T6: Full migration (domain + repo + service + handler + mock)** — `e67b451` (refactor)

## Files Created/Modified

- `internal/domain/laboratory.go` — `LaboratoryFilter`, `LaboratoryOrderFilter` added; both Repository.List signatures typed.
- `internal/platform/storage/postgres/laboratory_repository.go` — both `*FilterAllowlist` maps removed; typed List bodies for Laboratory and LaboratoryOrder; `withRelations` Preload chain preserved on the order list path.
- `internal/laboratory/service.go` — typed `ListLabs(db, f)` and `ListOrders(db, f)`; `ListPortfolioOrders` constructs typed filter internally.
- `internal/transport/http/v1/handler_laboratory.go` — `ShouldBindQuery` for both list endpoints; domain import added; `branchRepo.GetByID` lookup now writes to `f.Branch`.
- `internal/testutil/mocks/laboratory_repo.go` — typed mock signatures.

## Decisions Made

- **Single compound commit** — same reasoning as 21-04 / 21-05: changing the Repository interface forces matching repo impl, service callers, handler, and mock all in one go. Any partial split leaves HEAD uncompilable.
- **`Branch string \`form:"-"\`` instead of `BranchID *uint`** — the underlying DB column is the TEXT branch name, not an FK. The handler resolves `branch_id -> branch.Name` and writes the resolved name to `f.Branch` after ShouldBindQuery. Keeps the legacy DB schema compatible while letting the Filter pattern stay typed.
- **`AssignedSpecialistID *uint` form tag is `assigned_uid`** — matches the existing frontend query param without breaking clients.
- **`ListPortfolioOrders` keeps its old external signature** — the function is called from `handler_portfolio.go` which is out of 21-06 scope. Internally it now builds a typed Filter, but no breaking change ripples out.

## Deviations from Plan

- The plan template suggested an `_assigned_uid` subquery on `laboratory_order_statuses.notes` with pattern `[uid:X]`; the actual SQL was a direct `assigned_specialist_id = ?` predicate on `laboratory_orders`. The implementation preserves the real existing SQL, not the template.
- Plan template suggested `BranchID *uint` for the branch filter; reality is the column is TEXT, so the implementation uses `Branch string` with handler-side resolution.
- Plan template suggested removing `withRelations` from List; the existing Preload chain was preserved because the frontend depends on the related objects being eager-loaded in the listing.

## Issues Encountered

- Pre-existing `internal/inventory/service_test.go:36` build failure (calls `svc.CreateTransfer` with one argument; signature requires two) is still present. Documented in 21-02 through 21-05 summaries; will be addressed when phase 22 (test coverage) starts. Does not block plan completion (`make build` passes clean; only the inventory test package fails to compile).

## Next Phase Readiness

- 6 of 10 plans done in Phase 21 (60%).
- Pseudo-key migration template now established for any remaining endpoints that use `_xxx` map keys for complex SQL.
- 21-07 can begin immediately. No blockers.
