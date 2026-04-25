---
plan: 11-03
status: complete
phase: 11
---

## What Was Built

Wired all new service methods into HTTP handlers and registered all routes with correct RBAC. The specialist appointment lifecycle (take with conflict detection, complete, get-active) and the full clinical record CRUD + sign flow are now reachable via the API.

## Key Files

### Modified
- `convision-api-golang/internal/appointment/service.go` — Added `ErrActiveAppointment` error type; updated `Take` with conflict guard + `StartedAt` timestamp; added `Complete` (sets `CompletedAt`) and `GetActive` methods. These were present in the 11-02 worktree commit but were dropped during merge; restored here.
- `convision-api-golang/internal/transport/http/v1/handler_appointment.go` — Updated `TakeAppointment` to return HTTP 409 with `{ conflict: true, active_appointment_id }` on `ErrActiveAppointment`; added `CompleteAppointment` and `GetActiveAppointment` handlers.
- `convision-api-golang/internal/transport/http/v1/handler.go` — Added `clinicalRecord *clinicalrecordsvc.Service` and `followUp *followupsvc.Service` fields to Handler struct; updated `NewHandler` signature and constructor body to accept and store both new services.
- `convision-api-golang/cmd/api/main.go` — Removed `_ = clinicalRecordService` / `_ = followUpService` blanks; passed both services to `NewHandler`.
- `convision-api-golang/internal/transport/http/v1/routes.go` — Added `GET /appointments/active` (before `/:id` to avoid param clash), `POST /appointments/:id/complete`, and the full `/:id/clinical-record` sub-group with 7 endpoints plus 3 follow-up sub-routes. All clinical record routes use `RequireRole(RoleSpecialist, RoleAdmin)`.

### Created
- `convision-api-golang/internal/transport/http/v1/handler_clinical_record.go` — 10 handler methods: `CreateClinicalRecord`, `GetClinicalRecord`, `UpsertAnamnesis`, `UpsertVisualExam`, `UpsertDiagnosis`, `UpsertPrescription`, `SignAndCompleteClinicalRecord`, `UpsertFollowUpAnamnesis`, `UpsertFollowUpEvolution`, `UpsertFollowUpFormula`. Uses `defaultClinicID = 1` constant (single-clinic deployment; one schema per instance).

## Deviations

- `Claims` struct has no `ClinicID` field — this is a single-clinic system (one schema per DB instance). Used `defaultClinicID uint = 1` constant instead of reading from JWT.
- `CreateClinicalRecord` sets `input.SpecialistID = claims.UserID` from the JWT so the calling specialist is recorded automatically.
- `SignAndCompleteClinicalRecord` routes to `followUp.SignAndComplete` or `clinicalRecord.SignAndComplete` based on `record.RecordType`, implementing the plan's routing logic for the single sign endpoint.
- `ErrActiveAppointment` / `Complete` / `GetActive` were added back to appointment service because they were dropped during the phase-12 parallel merge into main.

## Self-Check

- [x] `GET /api/v1/appointments/active` → 200 with active appointment or 404
- [x] `POST /api/v1/appointments/:id/complete` → 200 on success, 422 on wrong status
- [x] `POST /api/v1/appointments/:id/take` → 409 with `{ conflict: true, active_appointment_id }` when conflict
- [x] All clinical record endpoints registered with `RequireRole(RoleSpecialist, RoleAdmin)`
- [x] `/active` registered before `/:id` in routes
- [x] `make build` passes (verified via `go build ./...` with 0 errors)
- [x] 3 atomic commits created
