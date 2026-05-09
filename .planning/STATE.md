---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
stopped_at: Phase 21.1 context gathered
last_updated: "2026-05-09T05:44:26.332Z"
last_activity: 2026-05-08 -- 21-10 (final cleanup — discount/lookup/user/dailyactivity typed Filter migration + parseApiFilters deleted + grep verification suite passes) complete
progress:
  total_phases: 17
  completed_phases: 7
  total_plans: 55
  completed_plans: 43
  percent: 78
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13)

**Core value:** Clinic staff can complete core operational and sales workflows reliably in one integrated system
**Current focus:** Phase 21 — standardize-backend-filter-pattern

## Current Position

Phase: 21 (standardize-backend-filter-pattern) — COMPLETE
Plan: 10 of 10 complete
Last activity: 2026-05-08 -- 21-10 (final cleanup — discount/lookup/user/dailyactivity typed Filter migration + parseApiFilters deleted + grep verification suite passes) complete
Next: Phase 22 (comprehensive-test-coverage)

Progress: [████████░░] 78%

## Performance Metrics

**Velocity:**

- Total plans completed: 22 (fase 6)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 06 | 4 | - | - |
| 14 | 5 | - | - |
| 16 | 9 | - | - |
| 18 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: 06-01 … 06-04
- Trend: Stable

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- [Phase bootstrap]: Run brownfield stabilization-first roadmap before feature expansion
- [21-03]: Bundled compound commits (T1+T2 / T3+T4 / T5+T6+T7) to keep HEAD compilable across Repository interface migrations
- [21-03]: Migrated outside-scope callers (bulkimport + sale) under Rule 3 (Blocking) — required for full project build
- [21-04]: Single compound commit (5 tasks, 15 files) — partial splits leave HEAD uncompilable; sale/quote/order are tightly coupled with no independently buildable subset
- [21-05]: Single compound commit (6 tasks, 21 files) — same compound-commit precedent for 6 finance/cash domains
- [21-05]: CashRegisterCloseRepository.List keeps role + userID as explicit args (typed domain.Role) instead of Filter fields — RBAC concerns separate from query filters
- [21-06]: Pseudo-key migration template — `_search` and `_assigned_uid` internal map keys promoted to explicit named Filter struct fields (`Search string`, `AssignedSpecialistID *uint`)
- [21-06]: Branch filter kept as `Branch string` with `form:"-"` (handler-resolved post-bind from `branch_id` -> `branch.Name` lookup) because the underlying DB column is TEXT not FK
- [21-07]: Naming-conflict avoidance — when a domain package already exposes `*Filter`, the new typed list filter takes a more specific name (e.g. `PrescriptionListFilter` coexisting with the unrelated `PrescriptionFilter` for lens compatibility) instead of forcing renames in out-of-scope code
- [21-07]: Plan-template vs reality — drop filter fields whose underlying DB column does not exist (e.g. `Status` removed from `SupplierFilter`); preserve existing SQL semantics when columns are denormalized (`PatientID` resolves via the appointments subquery for prescription)
- [21-08]: OR-ILIKE multi-column Search — when the legacy contract was `s_f=[fields]&s_v=[values]&s_o=or`, the typed replacement is a single `Search string \`form:"search"\`` field whose SQL fans out across the same columns the old allowlist mapped to ILIKE. Frontend keeps sending s_f/s_v until it migrates (graceful degradation: ShouldBindQuery silently ignores unknown params; the backend returns the unfiltered first page until the frontend updates).
- [21-08]: Pseudo-key promotion — the 5 `_-prefixed` map keys (`_start_date`, `_end_date`, `_patient_search`, `_attended_by`, `_pending_report`) used by ListAppointments and ListManagementReport are now explicit named fields on AppointmentFilter; SQL is identical, only the access path is typed.
- [21-08]: Repository helpers (`GetByPatientID`, `GetBySpecialistID`) now build typed AppointmentFilter values internally, leaving the appointments repository layer fully map-free (only handler.go's `parseApiFilters` definition remains, scoped for 21-10).
- [21-09]: Coexistence with existing `*Filter` JSON-DTO — `PrescriptionFilter` (used by `ListLensesByPrescription` POST) is a JSON body DTO, not a query Filter; the new typed query Filter takes the more specific name `LensCatalogFilter` and a clarifying comment is added on `PrescriptionFilter` to prevent future conflation.
- [21-09]: Per-eye prescription range params (`sphere_od`/`sphere_os`/`cylinder_od`/...) bind cleanly via `*float64` form-tagged pointers + `ShouldBindQuery`, replacing the explicit `strconv.ParseFloat` loop. Repository keeps the OD-priority-falls-back-to-OS rule when fanning to the joined `product_lens_attributes.{sphere,cylinder,addition}_{min,max}` ranges (matches the legacy `ListByPrescription` semantics).
- [21-09]: `ListByCategory` left untouched — its filter map carries 15+ heterogeneous attribute keys spanning three different attribute tables (lens, frame, contact_lens). Migrating it would require a substantive plan of its own and is outside 21-09's scope.
- [21-09]: `LensRepository.List` migrated to typed `LensFilter` despite zero production callers — phase 21 mandate is to leave the repository layer fully map-free; the type may disappear entirely in a future cleanup phase.
- [21-10]: Three atomic commits (T8b 16 files / T1+T2 1 file / T4 4 files) for the closing plan — each independent surface area committed separately; every commit leaves HEAD compilable.
- [21-10]: DailyActivityRepository pulled into 21-10 mid-flight — the daily-report endpoint added in phase 19 was missed by waves 02-09; T4 grep surfaced it and migrating in-plan honors the Phase 21 mandate (zero map-based List interfaces in domain/) without spawning a wave-11.
- [21-10]: UserFilter exposes explicit `Identification` field (not just `Search`) because bulkimport's scheduled-appointments importer needs an exact-token document-number lookup; the OR-ILIKE Search fan-out across 5 columns would produce ambiguous matches.
- [21-10]: UserFilter intentionally has no `BranchID` — the existing `ListUsers` handler reads `branch_id` from the query string itself with special "all"/"0" alias handling and routes to `repo.ListByBranch` (a separate code path) when set; keeping branchID as an explicit service parameter preserves that legacy behavior.
- [21-10]: parseApiFilters() helper deleted — symbolic close of Phase 21. The central s_f/s_v/s_o → map fan-out had zero remaining callers after waves 02-09 finished migrating their handlers.
- [21-10]: 3 documented out-of-scope `map[string]any` references remain in domain/ (product.ListByCategory + sale.GetStats/GetTodayStats); listed in 21-10 SUMMARY.md as deliberate exclusions, not regressions.

### Roadmap Evolution

- Phase 6 added: Cash Register Close Module — Cierre de Caja diario por asesor
- Phase 6 marked complete: 2026-04-14
- Phase 15 added: Mobile & Responsive Design — App funcione correctamente en PC, tablet y teléfono
- Phase 22 added: Comprehensive Test Coverage — unit + integration tests across Go backend (services, repositories, HTTP handlers) and React frontend (components, hooks, services) to lock current behavior and prevent regressions
- Phase 21.1 inserted after Phase 21: Migrate frontend to typed query params (URGENT)

### Pending Todos

None yet.

### Blockers/Concerns

- Brownfield codebase has many active in-flight changes; phase execution should stay incremental and verification-heavy.

## Session Continuity

Last session: 2026-05-09T05:44:26.315Z
Stopped at: Phase 21.1 context gathered
Resume file: .planning/phases/21.1-migrate-frontend-to-typed-query-params/21.1-CONTEXT.md
