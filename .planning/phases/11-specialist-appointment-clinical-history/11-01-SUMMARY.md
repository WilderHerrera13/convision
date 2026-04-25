---
plan: 11-01
status: complete
phase: 11
---

## What Was Built

Defined 6 new domain entities for the structured clinical record system and added lifecycle timestamp fields to `Appointment`. All entities follow the project's 3-layer architecture with proper GORM struct tags, repository interfaces, and SQL migrations.

**Task 1 — Appointment lifecycle fields + new interface method:**
- Added `StartedAt *time.Time` and `CompletedAt *time.Time` to `Appointment` struct
- Added `GetActiveBySpecialist(specialistID uint) (*Appointment, error)` to `AppointmentRepository` interface
- Implemented `GetActiveBySpecialist` in the PostgreSQL appointment repository (finds in-progress appointment for a specialist)

**Task 2 — Clinical record domain entities:**
- `ClinicalRecord` — top-level parent (record_type: new_consultation/follow_up, status: draft/signed, soft delete)
- `Anamnesis` — patient history and chief complaint
- `VisualExam` — full visual acuity (SC/CC, dist/near, OD/OI), objective and subjective refraction (sphere/cylinder/axis with NUMERIC(10,4)), keratometry, IOP, biomicroscopy, motility
- `ClinicalDiagnosis` — ICD-10 (CIE-10) codes, diagnosis type (main/related), related_codes as JSONB
- `ClinicalPrescription` — full optical formula (OD+OI: sphere/cylinder/axis/add with NUMERIC(10,4)), lens specs, treatments as JSONB, valid_until date, CUPS code
- `FollowUp` — patient evolution (evolution_type: stable/improved/worsened), formula_decision (maintain/update), new_diagnosis bool
- 6 repository interfaces defined with Create, GetByRecordID, Update methods (ClinicalDiagnosis also has Delete)
- Used `json.RawMessage` (already in go.mod) for JSONB fields instead of `gorm.io/datatypes` (not in go.mod)

**Task 3 — SQL migrations (000005–000011):**
- 000005: ALTER TABLE appointments ADD COLUMN started_at / completed_at
- 000006: CREATE TABLE clinical_records (with soft delete, set_updated_at trigger, partial indexes)
- 000007: CREATE TABLE anamneses
- 000008: CREATE TABLE visual_exams (all refraction columns as NUMERIC(10,4))
- 000009: CREATE TABLE clinical_diagnoses (JSONB + GIN index for related_codes)
- 000010: CREATE TABLE clinical_prescriptions (JSONB + GIN index for treatments)
- 000011: CREATE TABLE follow_ups
- All migrations use `IF NOT EXISTS`, TIMESTAMPTZ, CHECK constraints for enums, and set_updated_at triggers

**Task 4+5 — AutoMigrate + build:**
- Registered all 6 new structs in `Migrate()` in `db.go`
- `go build ./...` passes with zero errors

## Key Files

### Created
- `convision-api-golang/internal/domain/clinical_record.go` — all 6 entity structs + 6 repository interfaces
- `convision-api-golang/db/migrations/platform/000005_add_started_completed_at_to_appointments.up.sql`
- `convision-api-golang/db/migrations/platform/000005_add_started_completed_at_to_appointments.down.sql`
- `convision-api-golang/db/migrations/platform/000006_create_clinical_records.up.sql`
- `convision-api-golang/db/migrations/platform/000006_create_clinical_records.down.sql`
- `convision-api-golang/db/migrations/platform/000007_create_anamneses.up.sql`
- `convision-api-golang/db/migrations/platform/000007_create_anamneses.down.sql`
- `convision-api-golang/db/migrations/platform/000008_create_visual_exams.up.sql`
- `convision-api-golang/db/migrations/platform/000008_create_visual_exams.down.sql`
- `convision-api-golang/db/migrations/platform/000009_create_clinical_diagnoses.up.sql`
- `convision-api-golang/db/migrations/platform/000009_create_clinical_diagnoses.down.sql`
- `convision-api-golang/db/migrations/platform/000010_create_clinical_prescriptions.up.sql`
- `convision-api-golang/db/migrations/platform/000010_create_clinical_prescriptions.down.sql`
- `convision-api-golang/db/migrations/platform/000011_create_follow_ups.up.sql`
- `convision-api-golang/db/migrations/platform/000011_create_follow_ups.down.sql`

### Modified
- `convision-api-golang/internal/domain/appointment.go` — added StartedAt, CompletedAt fields and GetActiveBySpecialist to interface
- `convision-api-golang/internal/platform/storage/postgres/appointment_repository.go` — implemented GetActiveBySpecialist
- `convision-api-golang/internal/platform/storage/postgres/db.go` — registered 6 new entities in AutoMigrate

## Deviations

- Used `json.RawMessage` with `gorm:"type:jsonb"` instead of `datatypes.JSON` from `gorm.io/datatypes` because that package is not in go.mod and the project already uses `json.RawMessage` for JSONB fields (see `domain/cash.go`).
- `Anamnesis` table does not have `deleted_at` since it is a clinical sub-record (not a top-level clinical document); soft delete is handled at the `ClinicalRecord` level per plan intent.
- VisualExam, Anamnesis, Diagnoses, Prescriptions, and FollowUp tables do not have `deleted_at` individually — they are sub-records under `ClinicalRecord` which has soft delete.

## Self-Check

- [x] All acceptance criteria met
- [x] make build passes (`go build ./...` exits 0)
- [x] All 4 commits created
