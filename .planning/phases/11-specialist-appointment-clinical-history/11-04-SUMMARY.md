# 11-04 SUMMARY: Unit Tests for Specialist/Clinical Service Logic

## Status: COMPLETE

## Tasks Completed

### Task 1 — Appointment service lifecycle tests
File: `convision-api-golang/internal/appointment/service_lifecycle_test.go`

13 tests covering:
- `Take` success path: sets status to in_progress, assigns TakenByID, sets StartedAt
- `Take` idempotent StartedAt: does not overwrite StartedAt when already set (paused → resumed)
- `Take` conflict: returns `*ErrActiveAppointment` with correct ActiveID when specialist has in-progress appointment
- `Take` not found: returns `*domain.ErrNotFound` for unknown appointment ID
- `Take` invalid status: returns `*domain.ErrValidation` when appointment is not schedulable
- `Complete` success from in_progress: sets status to completed, sets CompletedAt
- `Complete` success from paused: paused appointment can also be completed
- `Complete` invalid status: scheduled appointment returns `*domain.ErrValidation`
- `Complete` not found: returns `*domain.ErrNotFound`
- `GetActive` found: returns in-progress appointment for specialist
- `GetActive` not found: returns `*domain.ErrNotFound` when no active appointment
- `Pause` success: in_progress → paused
- `Pause` invalid status: returns `*domain.ErrValidation` when not in_progress

Commit: `test(11-04): add appointment service lifecycle tests`

### Task 2 — Clinical record service tests
File: `convision-api-golang/internal/clinicalrecord/service_test.go`

15 tests covering:
- `CreateRecord`: creates ClinicalRecord with status "draft", correct clinic_id/appointment_id
- `GetRecord` found: returns matching record by appointment_id
- `GetRecord` wrong clinic: returns `*domain.ErrNotFound` for cross-clinic access
- `UpsertAnamnesis` create: creates new anamnesis with correct record_id
- `UpsertAnamnesis` update: updates existing anamnesis fields
- `UpsertAnamnesis` wrong clinic: returns `*domain.ErrNotFound`
- `UpsertVisualExam` create: stores visual acuity fields
- `UpsertDiagnosis` create: stores CIE-10 code and type
- `UpsertPrescription` create: stores sphere, auto-computes ValidUntil from ValidityMonths
- `SignAndComplete` success: all steps present → status=signed, SignedAt set, SignedByID set, LegalText stored
- `SignAndComplete` missing anamnesis: returns `*domain.ErrValidation`
- `SignAndComplete` missing prescription: returns `*domain.ErrValidation`
- `SignAndComplete` record not found: returns `*domain.ErrNotFound`
- `GetByAppointmentID` found
- `GetByAppointmentID` not found

Commit: `test(11-04): add clinical record service tests`

### Task 3 — Follow-up service tests
File: `convision-api-golang/internal/followup/service_test.go`

12 tests covering:
- `UpsertAnamnesis` create: creates FollowUp with control_reason, correction_satisfaction, and safe defaults for EvolutionType/FormulaDecision
- `UpsertAnamnesis` update: updates existing follow-up anamnesis fields
- `UpsertAnamnesis` wrong clinic: returns `*domain.ErrNotFound`
- `UpsertEvolution` create: creates FollowUp with evolution_type and description
- `UpsertEvolution` update: updates evolution_type on existing follow-up
- `UpsertFormula` create: creates FollowUp with formula_decision
- `UpsertFormula` update: updates formula_decision on existing follow-up
- `SignAndComplete` success: all required fields present → status=signed, SignedAt/SignedByID set
- `SignAndComplete` missing follow-up: returns `*domain.ErrValidation`
- `SignAndComplete` empty control_reason: returns `*domain.ErrValidation`
- `SignAndComplete` empty evolution_description: returns `*domain.ErrValidation`
- `SignAndComplete` record not found: returns `*domain.ErrNotFound`

Commit: `test(11-04): add followup service tests`

### Task 4 — All tests pass
```
ok  github.com/convision/api/internal/appointment     (13 tests)
ok  github.com/convision/api/internal/clinicalrecord  (15 tests)
ok  github.com/convision/api/internal/followup        (12 tests)
```
Total: **40 tests**, 0 failures.

## Implementation Notes

- All mocks are hand-written inside `_test` packages — no external mock frameworks used.
- `domain.Appointment` does not have a `ClinicID` field (appointments are not directly tenant-scoped at the struct level); clinical records carry `ClinicID` for multi-clinic isolation.
- The `ErrActiveAppointment` type is exported from the `appointment` package with an `ActiveID` field (not `ActiveAppointmentID` as the plan draft suggested).
- The worktree base required restoring HEAD files after `git reset --soft` unstaged previously committed code from phase 11-02/11-03.
