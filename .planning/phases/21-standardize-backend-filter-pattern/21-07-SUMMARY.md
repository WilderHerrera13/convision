---
phase: 21-standardize-backend-filter-pattern
plan: 07
subsystem: api
tags: [go, gorm, gin, filter-structs, supplier, prescription, clinical-history]

requires:
  - phase: 21-01
    provides: domain.Pagination struct + canonical Filter pattern documentation
  - phase: 21-02
    provides: RoleFilter / NotificationFilter reference template
  - phase: 21-05
    provides: 21-04/21-05 compound-commit precedent for Repository interface flips
  - phase: 21-06
    provides: pseudo-key migration template — `_search` promoted to typed `Search` field

provides:
  - SupplierFilter typed struct (internal/domain/supplier.go)
  - PrescriptionListFilter typed struct (internal/domain/prescription.go) — name avoids clash with unrelated lens-compatibility PrescriptionFilter in product.go
  - ClinicalHistoryFilter typed struct (internal/domain/clinic.go)
  - SupplierRepository.List / PrescriptionRepository.List / ClinicalHistoryRepository.List signatures migrated to typed Filter
  - ListSuppliers / ListPrescriptions / ListClinicalHistories handlers migrated to ShouldBindQuery
  - Mocks updated for all three repositories

affects: [21-08, 21-09, 21-10]

tech-stack:
  added: []
  patterns:
    - "Domain-name collision avoidance: when adding a Filter to a domain that already has another struct named *Filter (e.g. product.go has PrescriptionFilter for lens compatibility), use a more specific name (PrescriptionListFilter) instead of forcing a rename of the existing type."
    - "Frontend graceful-degradation: ShouldBindQuery silently ignores unknown query params (s_f/s_v/s_o), so backend can migrate to named filters before the frontend updates without breaking the contract."
    - "Cross-table Filter resolution: PrescriptionListFilter.PatientID translates to a subquery on appointments because prescription has no patient_id column — the typed Filter still maps cleanly to the existing SQL."

key-files:
  created: []
  modified:
    - convision-api-golang/internal/domain/supplier.go
    - convision-api-golang/internal/domain/prescription.go
    - convision-api-golang/internal/domain/clinic.go
    - convision-api-golang/internal/platform/storage/postgres/supplier_repository.go
    - convision-api-golang/internal/platform/storage/postgres/prescription_repository.go
    - convision-api-golang/internal/platform/storage/postgres/clinical_history_repository.go
    - convision-api-golang/internal/supplier/service.go
    - convision-api-golang/internal/prescription/service.go
    - convision-api-golang/internal/clinic/service.go
    - convision-api-golang/internal/transport/http/v1/handler_finance.go
    - convision-api-golang/internal/transport/http/v1/handler_prescription.go
    - convision-api-golang/internal/transport/http/v1/handler_clinical.go
    - convision-api-golang/internal/testutil/mocks/supplier_repo.go
    - convision-api-golang/internal/testutil/mocks/prescription_repo.go
    - convision-api-golang/internal/testutil/mocks/clinic_repo.go
    - convision-api-golang/internal/bulkimport/importer_lenses.go

key-decisions:
  - "Single compound commit (16 files) — same precedent as 21-04/21-05/21-06: Repository interface change forces matching repo impl + mock + service + handler all in one commit to keep HEAD compilable."
  - "Renamed the new typed prescription filter to `PrescriptionListFilter` because `domain.PrescriptionFilter` already exists in product.go for lens-compatibility ranges. Renaming the existing struct would have rippled into out-of-scope lens product code; keeping a domain-level distinction is safer and clearer at call sites."
  - "Dropped `Status` from SupplierFilter — the plan template suggested it, but the Supplier domain struct has no `status` column. Adding the field would have produced a SQL error at runtime when frontend ever passed it. Aligns with the 21-06 deviation pattern (only filter on real columns)."
  - "PrescriptionListFilter.PatientID translates to an `appointment_id IN (SELECT id FROM appointments WHERE patient_id = ?)` subquery because the prescription table has no patient_id column — preserves the existing `ListByPatientID` SQL semantics."
  - "Outside-scope caller `bulkimport/importer_lenses.go::resolveOrCreateSupplier` was migrated under Rule 3 (Blocking) — required for the project to build. Mirrors the 21-03 precedent (bulkimport + sale)."

patterns-established:
  - "Name-collision-aware Filter naming: when a domain package already exposes another struct named *Filter, the new typed Filter for the list endpoint takes a more specific name (XxxListFilter) instead of forcing renames in unrelated code."

requirements-completed: [FILTER-01, FILTER-02, FILTER-03, FILTER-04, FILTER-05]

duration: 12min
completed: 2026-05-08
---

# Phase 21-07: Clinical + Supplier Domains Filter Migration Summary

**Migrated supplier, prescription, and clinical-history list endpoints from `map[string]any` allowlists to typed Filter structs, retiring three filter allowlists (`supplierFilterAllowlist`, `prescriptionFilterAllowlist`, inline `allowedFilters`) and routing all three handlers through `c.ShouldBindQuery`.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 7 (committed as 1 compound commit)
- **Files modified:** 16

## Accomplishments

- `SupplierFilter` (Name, Email, Search, PersonType) added to `internal/domain/supplier.go`; `Search` triggers OR ILIKE across name/nit/legal_name/email/phone — replaces the `s_f/s_v/s_o=or` legacy contract.
- `PrescriptionListFilter` (AppointmentID, PatientID, CorrectionType, UsageType) added to `internal/domain/prescription.go`; `PatientID` resolves via the appointments subquery (prescription has no patient_id column).
- `ClinicalHistoryFilter` (PatientID, CreatedBy) added to `internal/domain/clinic.go`.
- `supplierFilterAllowlist`, `prescriptionFilterAllowlist`, and the inline `allowedFilters` map in clinical_history_repository.go are all deleted.
- `Service.List` for supplier, prescription, and clinic collapsed from `(db, filters, page, perPage)` to `(db, FilterStruct)`; `f.Clamp()` centralizes the pagination bounds.
- `ListSuppliers`, `ListPrescriptions`, and `ListClinicalHistories` handlers all use `c.ShouldBindQuery(&f)`. Unknown params (`s_f`, `s_v`, `s_o`) the frontend currently sends are silently ignored — graceful degradation as planned.
- `MockSupplierRepository.List`, `MockPrescriptionRepository.List`, and `MockClinicalHistoryRepository.List` mock signatures migrated to the typed Filter.
- Out-of-scope caller `bulkimport/importer_lenses.go::resolveOrCreateSupplier` converted under Rule 3 (Blocking) so the project still builds.
- `go build ./...` passes clean. `go test ./...` runs to completion with only the pre-existing `internal/inventory/service_test.go:36` build failure (documented in 21-02 through 21-06).

## Task Commits

1. **T1+T2+T3+T4+T5+T6+T7: Full migration (3 domain Filters + 3 repos + 3 services + 3 handlers + 3 mocks + 1 outside-scope caller)** — `d99f040` (refactor)

## Files Created/Modified

- `internal/domain/supplier.go` — `SupplierFilter` added; `SupplierRepository.List` typed.
- `internal/domain/prescription.go` — `PrescriptionListFilter` added (avoids clash with product.go's `PrescriptionFilter`); `PrescriptionRepository.List` typed.
- `internal/domain/clinic.go` — `ClinicalHistoryFilter` added; `ClinicalHistoryRepository.List` typed.
- `internal/platform/storage/postgres/supplier_repository.go` — allowlist removed; typed List with Search OR ILIKE.
- `internal/platform/storage/postgres/prescription_repository.go` — allowlist removed; typed List with PatientID subquery on appointments.
- `internal/platform/storage/postgres/clinical_history_repository.go` — inline `allowedFilters` removed; typed List.
- `internal/supplier/service.go` — `List(db, f domain.SupplierFilter)`.
- `internal/prescription/service.go` — `List(db, f domain.PrescriptionListFilter)`.
- `internal/clinic/service.go` — `List(db, f domain.ClinicalHistoryFilter)`.
- `internal/transport/http/v1/handler_finance.go` — `ListSuppliers` uses `ShouldBindQuery`.
- `internal/transport/http/v1/handler_prescription.go` — `ListPrescriptions` uses `ShouldBindQuery`.
- `internal/transport/http/v1/handler_clinical.go` — `ListClinicalHistories` uses `ShouldBindQuery`.
- `internal/testutil/mocks/supplier_repo.go` — typed mock signature.
- `internal/testutil/mocks/prescription_repo.go` — typed mock signature.
- `internal/testutil/mocks/clinic_repo.go` — typed mock signature.
- `internal/bulkimport/importer_lenses.go` — `resolveOrCreateSupplier` migrated to `domain.SupplierFilter` (Rule 3 Blocking).

## Decisions Made

- **Single compound commit** — same reasoning as 21-04/21-05/21-06: changing three Repository interfaces forces matching repo impls, services, handlers, and mocks all in one go. Any partial split leaves HEAD uncompilable.
- **`PrescriptionListFilter` not `PrescriptionFilter`** — `domain.PrescriptionFilter` already exists in product.go for lens-compatibility ranges. Renaming the existing struct would have touched out-of-scope lens product code. Keeping a domain-level distinction is safer and self-documenting at call sites.
- **Dropped `Status` from `SupplierFilter`** — plan template suggested it, but the Supplier struct has no `status` column. Adding it would have produced a runtime SQL error if the frontend ever sent the param. Aligns with 21-06's "only filter on real columns" deviation.
- **`PrescriptionListFilter.PatientID` uses an appointments subquery** — the prescription table has no `patient_id` column; the existing `ListByPatientID` already used `appointment_id IN (SELECT id FROM appointments WHERE patient_id = ?)`. Preserves SQL semantics inside the typed-Filter shape.
- **bulkimport caller migrated** — Rule 3 (Blocking) precedent from 21-03; required for `go build ./...` to pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Naming Conflict] `PrescriptionFilter` already declared in product.go**
- **Found during:** T4 (Add PrescriptionFilter to domain/prescription.go)
- **Issue:** `domain.PrescriptionFilter` already exists in `internal/domain/product.go` (line 123) for lens-compatibility ranges. Adding a second `PrescriptionFilter` produced a "redeclared" Go build error.
- **Fix:** Named the new typed filter `PrescriptionListFilter` so the two structs coexist. Updated the Repository interface, repo, service, handler, and mock accordingly.
- **Files modified:** `internal/domain/prescription.go` and all callers in this plan.
- **Verification:** `go build ./...` passes.
- **Committed in:** `d99f040`

**2. [Rule 2 - Plan Template vs Reality] Removed `Status` from `SupplierFilter`**
- **Found during:** T2 (Add SupplierFilter to domain/supplier.go)
- **Issue:** Plan template included `Status string \`form:"status"\``, but the Supplier domain struct has no Status column.
- **Fix:** Dropped `Status` from `SupplierFilter`. Aligns with 21-06's deviation pattern (only filter on columns that actually exist).
- **Files modified:** `internal/domain/supplier.go`.
- **Verification:** `go build ./...` passes.
- **Committed in:** `d99f040`

**3. [Rule 3 - Blocking] bulkimport/importer_lenses.go uses old SupplierRepository.List signature**
- **Found during:** T7 (final build)
- **Issue:** `internal/bulkimport/importer_lenses.go::resolveOrCreateSupplier` calls `i.supplierRepo.List(db, map[string]any{"name": name}, 1, 1)` — the old signature.
- **Fix:** Migrated the call to `i.supplierRepo.List(db, domain.SupplierFilter{Pagination: domain.Pagination{Page: 1, PerPage: 1}, Name: name})`. Same precedent as 21-03 bulkimport changes.
- **Files modified:** `internal/bulkimport/importer_lenses.go`.
- **Verification:** `go build ./...` passes.
- **Committed in:** `d99f040`

**4. [Rule 2 - Plan Template vs Reality] `PrescriptionListFilter.PatientID` uses subquery**
- **Found during:** T4
- **Issue:** Plan template suggested `q.Where("patient_id = ?", *f.PatientID)`, but the prescription table has no `patient_id` column.
- **Fix:** Used `appointment_id IN (SELECT id FROM appointments WHERE patient_id = ?)` — same SQL the existing `ListByPatientID` method already uses.
- **Files modified:** `internal/platform/storage/postgres/prescription_repository.go`.
- **Verification:** `go build ./...` passes; the existing `ListByPatientID` codepath remains the canonical one.
- **Committed in:** `d99f040`

---

**Total deviations:** 4 auto-fixed (1 naming conflict, 2 template-vs-reality alignments, 1 Blocking caller migration)
**Impact on plan:** All four auto-fixes preserve correctness — the plan template anticipated `Status`/`patient_id` columns that do not exist and a `PrescriptionFilter` name that was already taken. The blocking-caller migration is a standard side-effect of Repository interface changes (mirrors 21-03/21-05). No scope creep.

## Issues Encountered

- Pre-existing `internal/inventory/service_test.go:36` build failure (calls `svc.CreateTransfer` with one argument; signature requires two) is still present. Documented in 21-02..21-06; will be addressed by phase 22 (test coverage). Does not block plan completion (`go build ./...` passes clean; only the inventory test package fails to compile).

## Next Phase Readiness

- 7 of 10 plans done in Phase 21 (70%).
- Three more remaining list endpoints still in the `parseApiFilters` set (handler_appointment.go and the catch-all in handler.go) for plans 21-08..21-10.
- 21-08 can begin immediately. No blockers.
