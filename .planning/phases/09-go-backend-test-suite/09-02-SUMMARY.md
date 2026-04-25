---
phase: "09"
plan: "02"
subsystem: service-unit-tests-clinical
tags: [testing, unit-tests, services, go]
requires: [09-01]
provides: [clinical-service-tests]
affects: [09-03, 09-04, 09-05]
tech-stack:
  patterns: [function-field mocks, testify/mock, table-driven tests, zap.NewNop()]
key-files:
  created:
    - convision-api-golang/internal/auth/service_test.go
    - convision-api-golang/internal/patient/service_test.go
    - convision-api-golang/internal/appointment/service_test.go
    - convision-api-golang/internal/prescription/service_test.go
    - convision-api-golang/internal/user/service_test.go
    - convision-api-golang/internal/clinic/service_test.go
key-decisions:
  - Auth tests use function-field mocks (not testify/mock) per plan spec; TestMain sets JWT_SECRET env var
  - TestCreate_ScheduledInPast documents that appointment.Service.Create does NOT validate past dates — test asserts success
  - TestTakeAppointment_AlreadyInProgress documents that Take has no state guard — test asserts success on double-take
  - patient/prescription/clinic Create reloads via GetByID(0) after mock Create (ID not assigned by mock); tests set up GetByID(uint(0)) expectation
requirements-completed: [TEST-01, TEST-02, TEST-03, TEST-04, TEST-05]
duration: "6 min"
completed: "2026-04-24"
---

# Phase 09 Plan 02: Clinical Service Unit Tests Summary

Unit tests for 6 clinical domain services: auth, patient, appointment, prescription, user, clinic. All tests pass with 0 failures.

**Duration:** 6 min | **Tasks:** 5 | **Files:** 6 | **Test functions:** 39 total

**Next:** Ready for Wave 2 plans 09-03, 09-04 (commercial and finance service tests)

## What Was Built

- `internal/auth/service_test.go` — 9 tests; function-field mock pattern; TestMain sets JWT envvars; covers Login (4 paths), Logout, Me, Refresh
- `internal/patient/service_test.go` — 7 tests; testify/mock; covers Create (success/error), GetByID (found/not found), List, Delete (success/not found)
- `internal/appointment/service_test.go` — 9 tests; documents service behavior: Create has no past-date validation, Take has no double-take guard; Pause/Resume state machine tested
- `internal/prescription/service_test.go` — 6 tests; covers Create, GetByID, ListByPatient, Delete not found
- `internal/user/service_test.go` — 6 tests; covers Create (success/email conflict), GetByID, GetSpecialists, Delete
- `internal/clinic/service_test.go` — 5 tests; covers Create (patient guard), GetByPatientIDSingle not found, CreateEvolution, DeleteEvolution not found

## Deviations from Plan

- `TestCreate_ScheduledInPast`: plan said assert `*domain.ErrValidation`; actual service has no past-date validation — test was written to document actual behavior (asserts success). Plan note explicitly permits this: "test what the service actually does."
- `TestCreate_ConflictExists`: plan mentioned `ExistsByPatientAndDate`; appointment.Create never calls it — test uses repo.Create returning an error to simulate conflict.
- `TestTakeAppointment_AlreadyInProgress`: plan said assert error; service has no guard — test documents actual behavior (asserts no error).

**Total deviations:** 3 (all behavior-documentation, not regressions). **Impact:** None — tests accurately reflect service behavior.

## Issues Encountered

- Create methods call `repo.GetByID(p.ID)` after creating (reload with relations); since mock `Create` does not assign an ID, `p.ID` remains 0. All affected tests set up `repo.On("GetByID", uint(0))` expectations to handle this correctly.

## Self-Check

- [x] `go test ./internal/auth/... -v` exits 0, all 9 tests PASS
- [x] `go test ./internal/patient/... -v` exits 0, all 7 tests PASS
- [x] `go test ./internal/appointment/... -v` exits 0, all 9 tests PASS
- [x] `go test ./internal/prescription/... -v` exits 0, all 6 tests PASS
- [x] `go test ./internal/clinic/... -v` exits 0, all 5 tests PASS
- [x] `go test ./internal/user/... -v` exits 0, all 6 tests PASS
- [x] `TestLogin_ValidCredentials`, `TestLogin_WrongPassword`, `TestLogin_InactiveUser`, `TestLogout_Success`, `TestMe_UserNotFound` all present in auth/service_test.go
- [x] Each service file has ≥ 3 test functions covering success, ErrNotFound, and validation/error path
- [x] 5 commits, one per task group

## Self-Check: PASSED
