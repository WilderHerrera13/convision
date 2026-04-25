---
plan: 11-02
status: complete
phase: 11
---

## What Was Built

Implemented the full persistence layer for all 6 new clinical record entities and extended the appointment service with conflict detection, `Complete`, and `GetActive`. Created two new service packages: `clinicalrecord` (new consultation flow) and `followup` (control visit flow). Wired all new repos and services in `main.go`.

## Key Files

### Created
- `convision-api-golang/internal/domain/clinical_record.go` — domain structs and repository interfaces for ClinicalRecord, Anamnesis, VisualExam, ClinicalDiagnosis, ClinicalPrescription, FollowUp (recreated in this worktree; existed in 11-01 worktree)
- `convision-api-golang/internal/platform/storage/postgres/clinical_record_repository.go` — 6 repository implementations: ClinicalRecordRepository, AnamnesisRepository, VisualExamRepository, ClinicalDiagnosisRepository, ClinicalPrescriptionRepository, FollowUpRepository. Each has a constructor and Upsert pattern (find-or-create via `First` + `Create`/`Update`).
- `convision-api-golang/internal/clinicalrecord/service.go` — Service with 8 methods: `CreateRecord`, `GetRecord`, `GetByAppointmentID`, `UpsertAnamnesis`, `UpsertVisualExam`, `UpsertDiagnosis`, `UpsertPrescription`, `SignAndComplete`. CUPS 890205 for new_consultation, 890307 for follow_up.
- `convision-api-golang/internal/followup/service.go` — Service with 5 methods: `UpsertAnamnesis`, `UpsertEvolution`, `UpsertFormula`, `SignAndComplete`, `GetByAppointmentID`. CUPS 890307. Validates ControlReason + EvolutionDescription before signing.

### Modified
- `convision-api-golang/internal/domain/appointment.go` — Added `StartedAt` and `CompletedAt` fields to `Appointment` struct; added `GetActiveBySpecialist` to `AppointmentRepository` interface.
- `convision-api-golang/internal/platform/storage/postgres/appointment_repository.go` — Fixed merge conflict, corrected `GetActiveBySpecialist` to filter on `taken_by_id` (not `specialist_id`), added `started_at` and `completed_at` to `Update` map.
- `convision-api-golang/internal/platform/storage/postgres/db.go` — Added 6 clinical record entities to `AutoMigrate`.
- `convision-api-golang/internal/appointment/service.go` — Added `ErrActiveAppointment` error type; updated `Take` with conflict guard + `StartedAt` timestamp; added `Complete` (sets `CompletedAt`) and `GetActive` methods.
- `convision-api-golang/cmd/api/main.go` — Added imports for `clinicalrecord` and `followup` packages; initialized 6 new repos and 2 new services.

## Deviations

- `GetActiveBySpecialist` in appointment_repository was already present but filtered on `specialist_id` instead of `taken_by_id`. Fixed to match the plan's intent (the `Take` method sets `taken_by_id`, so conflict detection must check that column).
- `clinical_record.go` domain file was not present in this worktree (it existed only in the 11-01 worktree that had been merged to main but not rebased here). Recreated it identically before proceeding.
- The `ClinicalDiagnosisRepository` interface uses `GetByRecordID` (returns `[]*ClinicalDiagnosis`) rather than a single-record Upsert pattern. The service handles upsert by type (main/related) at the service layer.
- `_ = clinicalRecordService` and `_ = followUpService` blanks used in `main.go` to avoid "declared and not used" errors until the handler is extended in plan 11-03.

## Self-Check

- [x] All acceptance criteria met
- [x] `make build` passes (verified via `go build ./...` with 0 errors)
- [x] All commits created (4 atomic commits)
