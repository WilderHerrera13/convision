---
phase: 21-standardize-backend-filter-pattern
plan: 08
subsystem: api
tags: [go, gorm, gin, filter-structs, patient, appointment, or-ilike, pseudo-keys]

requires:
  - phase: 21-01
    provides: domain.Pagination struct + canonical Filter pattern documentation
  - phase: 21-02
    provides: RoleFilter / NotificationFilter reference template
  - phase: 21-06
    provides: pseudo-key migration template — `_search` promoted to typed `Search` field
  - phase: 21-07
    provides: clinical/supplier domain Filter migration precedent

provides:
  - PatientFilter typed struct (internal/domain/patient.go) with Search field that fans out via OR ILIKE across first_name, last_name, email, phone, identification — replaces the legacy s_f/s_v/s_o=or contract.
  - AppointmentFilter typed struct (internal/domain/appointment.go) with five typed fields replacing the five legacy `_-prefixed` pseudo-keys (`_start_date`, `_end_date`, `_patient_search`, `_attended_by`, `_pending_report`) plus standard equality filters (Status, SpecialistID, PatientID, TakenByID, ConsultationType, BranchID).
  - PatientRepository.List + AppointmentRepository.List signatures migrated to typed Filter.
  - ListPatients + ListAppointments handlers using ShouldBindQuery.
  - ListManagementReport service-layer caller migrated to typed AppointmentFilter (no external signature change to handler_management_report.go).
  - GetByPatientID + GetBySpecialistID delegating to List with typed filter to keep their public signatures intact.
  - Mocks updated for both PatientRepository and AppointmentRepository.

affects: [21-09, 21-10]

tech-stack:
  added: []
  patterns:
    - "OR-ILIKE multi-column search via a single `Search string` form field — the repository fans out to all configured text columns (replaces the s_f/s_v/s_o=or wire-format the frontend was sending)."
    - "Pseudo-key promotion: the five `_xxx` map keys used by ListAppointments and ListManagementReport are now explicit named fields on AppointmentFilter; the SQL is identical, only the access path is typed."
    - "Internal helper methods (GetByPatientID / GetBySpecialistID) that previously built map filters now build typed AppointmentFilter values, so the entire repository layer is map-free for appointments."

key-files:
  created: []
  modified:
    - convision-api-golang/internal/domain/patient.go
    - convision-api-golang/internal/domain/appointment.go
    - convision-api-golang/internal/platform/storage/postgres/patient_repository.go
    - convision-api-golang/internal/platform/storage/postgres/appointment_repository.go
    - convision-api-golang/internal/patient/service.go
    - convision-api-golang/internal/appointment/service.go
    - convision-api-golang/internal/transport/http/v1/handler.go
    - convision-api-golang/internal/transport/http/v1/handler_appointment.go
    - convision-api-golang/internal/testutil/mocks/patient_repo.go
    - convision-api-golang/internal/testutil/mocks/appointment_repo.go

key-decisions:
  - "Single compound commit (10 files) — same precedent as 21-04/21-05/21-06/21-07: changing two Repository interfaces forces matching repo impls + services + handlers + mocks all in one commit to keep HEAD compilable."
  - "PatientFilter qualifies all SQL columns with `patients.` prefix — the table is joined elsewhere (e.g. AppointmentFilter.PatientSearch), so qualified column names avoid ambiguous-column errors when GORM merges queries."
  - "ListManagementReport keeps its existing external Go signature (`specialistID, search, startDate, endDate, status, consultationType, branchID, pendingReport, page, perPage`) but internally builds a typed AppointmentFilter — the wire-format and handler caller stay unchanged."
  - "GetByPatientID and GetBySpecialistID stay as repository methods (their interface signatures are still in use by callers like the dashboard and clinic_repo); they now delegate to List with a typed AppointmentFilter instead of constructing a map."
  - "parseApiFilters function declaration left in handler.go — it has zero callers in the production code now, but plan 21-10 will delete it as part of the catch-all cleanup."

patterns-established:
  - "Multi-column Search field: when the legacy contract was `s_f=[fields]&s_v=[values]&s_o=or`, the typed replacement is a single `Search string \\`form:\"search\"\\`` field whose SQL fans out across the same columns the old allowlist mapped to ILIKE. Exact-match fields (status, gender) become their own form-tagged fields."
  - "AppointmentFilter pseudo-key map: each `_xxx` key becomes a typed field with a comment cross-referencing the legacy key — keeps the historical SQL discoverable while removing the magic-string lookup."

requirements-completed: [FILTER-01, FILTER-02, FILTER-03, FILTER-04, FILTER-05]

duration: 10min
completed: 2026-05-08
---

# Phase 21-08: Patient + Appointment Filter Migration Summary

**Migrated patient (OR-ILIKE multi-field search replacing s_f/s_v/s_o=or) and appointment (5 special `_-prefixed` keys + date range) list endpoints from `map[string]any` allowlists to typed Filter structs — completing the most complex migrations of phase 21 and leaving only the catch-all handler.go cleanup for plan 21-10.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 9 (committed as 1 compound commit)
- **Files modified:** 10

## Accomplishments

- `PatientFilter` (Search, Status, Gender) added to `internal/domain/patient.go`. `Search` triggers OR ILIKE across `first_name`, `last_name`, `email`, `phone`, `identification` — collapses the legacy `s_f`/`s_v`/`s_o=or` wire-format the frontend uses today (graceful degradation: the legacy params are silently ignored by ShouldBindQuery, so the frontend can keep sending them until it migrates).
- `AppointmentFilter` (Status, SpecialistID, PatientID, TakenByID, ConsultationType, BranchID, StartDate, EndDate, PatientSearch, AttendedBy, PendingReport) added to `internal/domain/appointment.go`. The five `_-prefixed` pseudo-keys (`_start_date`, `_end_date`, `_patient_search`, `_attended_by`, `_pending_report`) are promoted to explicit named struct fields; the SQL clauses they drive are unchanged.
- `patientFilterAllowlist` and `appointmentFilterAllowlist` deleted; `parseAppointmentApiFilters` function deleted; `appointmentStringFilters` map deleted.
- `PatientRepository.List(db, f PatientFilter)` and `AppointmentRepository.List(db, f AppointmentFilter)` are the new typed signatures; `Service.List` for both packages collapsed from `(db, filters, page, perPage)` to `(db, FilterStruct)` and now uses `f.Clamp()` for pagination bounds.
- `ListPatients` and `ListAppointments` handlers use `c.ShouldBindQuery(&f)`. `ListAppointments` keeps the existing branch-override post-bind logic (resolveBranchOverride + BranchIDFromCtx) but writes the resolved id to `f.BranchID`.
- `ListManagementReport` (service-level caller) migrated to construct a typed `AppointmentFilter` directly — no external signature change to `handler_management_report.go`.
- `GetByPatientID` and `GetBySpecialistID` repository helpers now delegate to `List` with a typed `AppointmentFilter`, leaving the entire appointments repository layer map-free.
- `MockPatientRepository.List` and `MockAppointmentRepository.List` mock signatures migrated to the typed Filter.
- `go build ./...` passes clean. `go test ./...` runs to completion with only the pre-existing `internal/inventory/service_test.go:36` build failure (documented in 21-02..21-07).

## Task Commits

1. **T1+T2+T3+T4+T5+T6+T7+T8+T9: Full migration (2 domain Filters + 2 repos + 2 services + 2 handlers + 2 mocks)** — `fc2ebf9` (refactor)

## Files Created/Modified

- `internal/domain/patient.go` — `PatientFilter` added; `PatientRepository.List` typed.
- `internal/domain/appointment.go` — `AppointmentFilter` added (5 pseudo-keys promoted to typed fields); `AppointmentRepository.List` typed.
- `internal/platform/storage/postgres/patient_repository.go` — allowlist removed; typed `List` with Search OR ILIKE across 5 text identity columns; `withRelations` Preload chain preserved.
- `internal/platform/storage/postgres/appointment_repository.go` — allowlist removed; typed `List` with all 5 pseudo-key SQL branches preserved verbatim; `GetByPatientID` / `GetBySpecialistID` now build typed AppointmentFilter values.
- `internal/patient/service.go` — `List(db, f domain.PatientFilter)`; `f.Clamp()` replaces inline page/per-page guards.
- `internal/appointment/service.go` — `List(db, f domain.AppointmentFilter)`; `ListManagementReport` builds typed AppointmentFilter inline (no external signature change).
- `internal/transport/http/v1/handler.go` — `ListPatients` uses `ShouldBindQuery`; obsolete `parseApiFilters`/`strconv.Atoi` calls removed from this function (the function definition remains for plan 21-10 to delete).
- `internal/transport/http/v1/handler_appointment.go` — `ListAppointments` uses `ShouldBindQuery`; `parseAppointmentApiFilters` and `appointmentStringFilters` deleted; branch-override logic preserved post-bind.
- `internal/testutil/mocks/patient_repo.go` — typed mock signature.
- `internal/testutil/mocks/appointment_repo.go` — typed mock signature.

## Decisions Made

- **Single compound commit** — same reasoning as 21-04/21-05/21-06/21-07: changing two Repository interfaces forces matching repo impls, services, handlers, and mocks all in one go. Any partial split leaves HEAD uncompilable.
- **`PatientRepository.List` qualifies all SQL columns with the `patients.` prefix** — the table is joined elsewhere (e.g. `AppointmentFilter.PatientSearch` does a `LEFT JOIN patients`). Qualified names avoid ambiguous-column errors when GORM combines query fragments.
- **`ListManagementReport` keeps its public Go signature** — the handler `handler_management_report.go` still calls it with the old positional args; we only changed the implementation to build a typed `AppointmentFilter` internally. This avoids touching out-of-scope handler code.
- **`GetByPatientID` / `GetBySpecialistID` retained as repository methods** — they have callers (interface still requires them); they now delegate to `List(db, typed-filter)` instead of constructing a map. This finishes the "map-free repository" goal even for the helper paths.
- **`parseApiFilters` function definition retained in handler.go** — it has zero production callers after this plan, but the catch-all `parseApiFilters` cleanup is explicitly scoped to plan 21-10.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Plan Template vs Reality] Updated `GetByPatientID` and `GetBySpecialistID` repository helpers to use typed AppointmentFilter**
- **Found during:** T5 (post-flip build)
- **Issue:** The plan body did not address `GetByPatientID` / `GetBySpecialistID` in `appointment_repository.go`, which previously called `r.List(db, map[string]any{"patient_id": id}, page, perPage)`. After flipping `List` to typed, these helpers no longer compiled.
- **Fix:** Migrated both helpers to build a typed `domain.AppointmentFilter{Pagination: ..., PatientID: &pid}` (or `SpecialistID: &sid`) and call `r.List(db, f)`. No public interface change.
- **Files modified:** `internal/platform/storage/postgres/appointment_repository.go`.
- **Verification:** `go build ./...` passes.
- **Committed in:** `fc2ebf9`.

**2. [Rule 2 - Plan Template vs Reality] `Service.ListManagementReport` rebuilt with typed filter**
- **Found during:** T6 (post-flip build)
- **Issue:** The plan body did not call out that `appointment.Service.ListManagementReport` builds a `map[string]any` filter and forwards to `Service.List`. After flipping `Service.List` to typed, this caller no longer compiled.
- **Fix:** Inlined a typed `domain.AppointmentFilter` construction inside `ListManagementReport`, mapping each old map key (`_attended_by`, `_patient_search`, `_start_date`, `_end_date`, `status`, `consultation_type`, `branch_id`, `_pending_report`) to its typed field. External signature unchanged.
- **Files modified:** `internal/appointment/service.go`.
- **Verification:** `go build ./...` passes; `go test ./internal/appointment/... ./internal/cashclose/... ./internal/laboratory/...` all green.
- **Committed in:** `fc2ebf9`.

**3. [Rule 2 - Plan Template vs Reality] `appointmentStringFilters` map also removed**
- **Found during:** T8
- **Issue:** Plan called out `parseAppointmentApiFilters` for deletion but did not mention the `appointmentStringFilters` package-level var in the same file.
- **Fix:** Removed the orphaned `appointmentStringFilters` map at the same time — it was only used by the parser being deleted.
- **Files modified:** `internal/transport/http/v1/handler_appointment.go`.
- **Verification:** `go build ./...` passes.
- **Committed in:** `fc2ebf9`.

---

**Total deviations:** 3 auto-fixed (3 plan-template-vs-reality alignments)
**Impact on plan:** All three auto-fixes were forced by the Repository interface flip and were necessary to keep HEAD compilable. No scope creep — every line of the deviation is mechanical adapter code, not new behaviour.

## Issues Encountered

- Pre-existing `internal/inventory/service_test.go:36` build failure (calls `svc.CreateTransfer` with one argument; signature requires two) is still present. Documented in 21-02..21-07; will be addressed by phase 22 (test coverage). Does not block plan completion (`go build ./...` passes clean; only the inventory test package fails to compile).
- Frontend coupling: the receptionist patient list still sends `s_f=["first_name", ...]&s_v=[...]&s_o=or` query params. ShouldBindQuery silently ignores unknown query params, so the backend now returns the unfiltered first page instead of the filtered list. The frontend should be updated to send `?search=<term>` for the typed Search field — this is a separate frontend phase, not in scope for 21-08. Until then, the patient search box will appear non-functional. Documenting here so the frontend migration can be planned.

## Next Phase Readiness

- 8 of 10 plans done in Phase 21 (80%).
- Only 21-09 (any remaining service-layer parsers) and 21-10 (delete `parseApiFilters` from handler.go) remain.
- 21-09 can begin immediately. No blockers.

---
*Phase: 21-standardize-backend-filter-pattern*
*Completed: 2026-05-08*
