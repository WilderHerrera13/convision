---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
stopped_at: Completed 21-09-PLAN.md
last_updated: "2026-05-09T01:00:00.000Z"
last_activity: 2026-05-08 -- Phase 21 plan 09 (product + lens-catalog + standalone-lens typed Filter migration; PrescriptionFilter JSON DTO preserved; strconv.ParseFloat loop replaced) complete
progress:
  total_phases: 16
  completed_phases: 6
  total_plans: 55
  completed_plans: 42
  percent: 76
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13)

**Core value:** Clinic staff can complete core operational and sales workflows reliably in one integrated system
**Current focus:** Phase 21 — standardize-backend-filter-pattern

## Current Position

Phase: 21 (standardize-backend-filter-pattern) — EXECUTING
Plan: 9 of 10 complete
Last activity: 2026-05-08 -- 21-09 (product + lens-catalog + standalone-lens typed Filter migration; PrescriptionFilter JSON DTO preserved; strconv.ParseFloat loop replaced) complete
Next: 21-10

Progress: [████████░░] 76%

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

### Roadmap Evolution

- Phase 6 added: Cash Register Close Module — Cierre de Caja diario por asesor
- Phase 6 marked complete: 2026-04-14
- Phase 15 added: Mobile & Responsive Design — App funcione correctamente en PC, tablet y teléfono
- Phase 22 added: Comprehensive Test Coverage — unit + integration tests across Go backend (services, repositories, HTTP handlers) and React frontend (components, hooks, services) to lock current behavior and prevent regressions

### Pending Todos

None yet.

### Blockers/Concerns

- Brownfield codebase has many active in-flight changes; phase execution should stay incremental and verification-heavy.

## Session Continuity

Last session: 2026-05-09T01:00:00.000Z
Stopped at: Completed 21-09-PLAN.md
Resume file: None
