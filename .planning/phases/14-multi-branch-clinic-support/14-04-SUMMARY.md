---
phase: 14-multi-branch-clinic-support
plan: 14-04
subsystem: backend
tags: [go, gin, middleware, branch, scoping, queries, appointments, sales, cash-close, daily-activity, inventory, clinical-records]

# Dependency graph
requires:
  - phase: 14-02
    provides: Branch domain entity, BranchRepository interface, branch.Service, BranchID field on domain structs
  - phase: 14-03
    provides: BranchContext middleware with BranchIDFromCtx helper, branch-scoped route groups, X-Branch-ID validation
provides:
  - All branch-local entities (appointments, sales, cash register closes, daily activity reports, warehouses, inventory items) filtered by branch_id from Gin context
  - Create operations for all branch-scoped entities set branch_id from context, not from request body
  - Clinical record handlers use BranchIDFromCtx instead of hardcoded value 1
affects: [frontend-branch-scoping]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Branch-scoped query pattern: handler extracts BranchIDFromCtx → passes to service input → repository filters List with WHERE branch_id = ?
    - Context-as-authority pattern: Create operations set BranchID from BranchIDFromCtx(c), ignoring any client-sent branch_id
    - Consistency across 6 entity groups using identical pattern

key-files:
  created: []
  modified:
    - convision-api-golang/internal/appointment/service.go
    - convision-api-golang/internal/platform/storage/postgres/appointment_repository.go
    - convision-api-golang/internal/transport/http/v1/handler_appointment.go
    - convision-api-golang/internal/sale/service.go
    - convision-api-golang/internal/platform/storage/postgres/sale_repository.go
    - convision-api-golang/internal/transport/http/v1/handler_sale.go
    - convision-api-golang/internal/cashclose/service.go
    - convision-api-golang/internal/platform/storage/postgres/cash_register_close_repository.go
    - convision-api-golang/internal/transport/http/v1/handler_cash_register_close.go
    - convision-api-golang/internal/dailyactivity/service.go
    - convision-api-golang/internal/platform/storage/postgres/daily_activity_repository.go
    - convision-api-golang/internal/transport/http/v1/handler_t10.go
    - convision-api-golang/internal/inventory/service.go
    - convision-api-golang/internal/platform/storage/postgres/warehouse_repository.go
    - convision-api-golang/internal/platform/storage/postgres/inventory_item_repository.go
    - convision-api-golang/internal/transport/http/v1/handler_inventory.go
    - convision-api-golang/internal/transport/http/v1/handler_appointment_clinical_record.go

key-decisions:
  - "Branch_id from Gin context (set by BranchContext middleware) is the single source of truth for all Create operations"
  - "List queries filter by branch_id as the FIRST predicate to narrow the result set before applying other filters"
  - "Clinical record Upsert handlers forward rec.BranchID (derived from context at record creation), preserving per-record branch ownership"
  - "Sales statistics (GetStats, GetTodayStats) left global — branch-specific analytics deferred to future phase"

patterns-established:
  - "Branch-scoped query: handler → BranchIDFromCtx(c) → service.CreateInput.BranchID → repository.Create/set on struct"
  - "Branch-scoped list: handler → BranchIDFromCtx(c) → filters[\"branch_id\"] → repository WHERE branch_id = ?"
  - "Consistency: all 6 entity groups (appointments, sales, cash closes, daily activity, inventory, clinical records) use identical pattern"

requirements-completed: [BRANCH-01, BRANCH-02, BRANCH-03, BRANCH-06, BRANCH-07]

# Metrics
duration: ~20min
completed: 2026-04-28
---

# Phase 14 Plan 4: Backend Scoped Queries Summary

**Branch_id wired into all branch-local handlers, services, and repositories — 6 entity groups (appointments, sales, cash closes, daily activity, warehouses/inventory, clinical records) scoped via BranchIDFromCtx from BranchContext middleware**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-28T15:20:00Z
- **Completed:** 2026-04-28T15:40:00Z
- **Tasks:** 6
- **Files modified:** 17

## Accomplishments

- All 6 entity groups now read `branch_id` from Gin context and filter list queries by it
- Create operations for all branch-scoped entities set `branch_id` from context (not from client request body)
- Clinical record `CreateAppointmentClinicalRecord` handler switched from hardcoded `BranchID: 1` to `BranchIDFromCtx(c)`
- All Upsert methods (Anamnesis, VisualExam, Diagnosis, Prescription) use `rec.BranchID` (derived from context)
- Zero references to `ClinicID`/`clinicID` remain in clinical record repository or service
- Build passes cleanly with `go build ./cmd/api/`

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire branch_id into appointments** — `940d02e` (feat)
2. **Task 2: Wire branch_id into sales** — `3f1a05c` (feat)
3. **Task 3: Wire branch_id into cash register closes** — `61fec5a` (feat)
4. **Task 4: Wire branch_id into daily activity reports** — `959bbe7` (feat)
5. **Task 5: Wire branch_id into warehouses and inventory items** — `97b1e8d` (feat)
6. **Task 6: Wire branch_id into clinical records** — `a1e3837` (feat)

## Files Created/Modified

- `convision-api-golang/internal/appointment/service.go` — Added `BranchID uint` to `CreateInput` struct
- `convision-api-golang/internal/platform/storage/postgres/appointment_repository.go` — Added `branch_id` filter in List
- `convision-api-golang/internal/transport/http/v1/handler_appointment.go` — Uses `BranchIDFromCtx(c)` for ListAppointments and CreateAppointment
- `convision-api-golang/internal/sale/service.go` — Added `BranchID uint` to `CreateInput` struct
- `convision-api-golang/internal/platform/storage/postgres/sale_repository.go` — Added `branch_id` filter in List
- `convision-api-golang/internal/transport/http/v1/handler_sale.go` — Uses `BranchIDFromCtx(c)` for ListSales and CreateSale
- `convision-api-golang/internal/cashclose/service.go` — Added `BranchID uint` to `CreateInput` struct
- `convision-api-golang/internal/platform/storage/postgres/cash_register_close_repository.go` — Added `branch_id` filter in List
- `convision-api-golang/internal/transport/http/v1/handler_cash_register_close.go` — Uses `BranchIDFromCtx(c)` for List and Create
- `convision-api-golang/internal/dailyactivity/service.go` — Added `BranchID uint` to `CreateInput` struct
- `convision-api-golang/internal/platform/storage/postgres/daily_activity_repository.go` — Added `branch_id` filter in List
- `convision-api-golang/internal/transport/http/v1/handler_t10.go` — Uses `BranchIDFromCtx(c)` for List and Create handlers
- `convision-api-golang/internal/inventory/service.go` — Added `BranchID uint` to `WarehouseCreateInput` and `InventoryItemCreateInput`
- `convision-api-golang/internal/platform/storage/postgres/warehouse_repository.go` — Added `branch_id` filter in List
- `convision-api-golang/internal/platform/storage/postgres/inventory_item_repository.go` — Added `branch_id` filter in List
- `convision-api-golang/internal/transport/http/v1/handler_inventory.go` — Uses `BranchIDFromCtx(c)` for warehouses, inventory items, and locations
- `convision-api-golang/internal/transport/http/v1/handler_appointment_clinical_record.go` — Replaced hardcoded `BranchID: 1` with `BranchIDFromCtx(c)`; added import

## Decisions Made

- **Context as single source of truth:** BranchID for all Create operations is drawn from `BranchIDFromCtx(c)` (set by BranchContext middleware in 14-03), not from the request body. This prevents cross-branch data injection.
- **Filter ordering:** `branch_id` is applied as the first WHERE predicate in all List queries, narrowing the result set before other client-specified filters.
- **Clinical records use record-level branch ownership:** Upsert handlers pass `rec.BranchID` (the branch stored on the clinical record at creation time), preserving per-record branch ownership even if the X-Branch-ID header changes between requests. The plan accept this as functionally equivalent to `BranchIDFromCtx(c)`.
- **Stats endpoints left global:** `GetStats` and `GetTodayStats` in the sales service remain un-scoped — branch-specific analytics is deferred to a future phase.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- All 6 branch-scoped entity groups now enforce branch filtering via `BranchIDFromCtx`
- Frontend must now send `X-Branch-ID` header with all requests to branch-scoped endpoints
- Ready for 14-05 (frontend branch integration)

---

*Phase: 14-multi-branch-clinic-support*
*Completed: 2026-04-28*
