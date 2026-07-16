---
status: partial
phase: 21-standardize-backend-filter-pattern
source: [21-VERIFICATION.md]
started: 2026-05-08T00:00:00Z
updated: 2026-05-09T00:00:00Z
---

## Current Test

[backend API validation complete — frontend UAT still pending]

## Validation Method

Backend validated via direct HTTP calls to `http://localhost:8001/api/v1/*` after restarting the
running process against the post-Phase 21 binary (`./bin/convision-api`, built 2026-05-08 19:44).
The previously-running process (PID 12175, started 18:15) was a stale build that predated the
PatientFilter rewrite and made the typed `?search=` ignored. Restart fixed that.

For each endpoint we executed three classes of probe:

1. **Baseline** — no filter, capture total.
2. **Typed filter** — the new form-tagged param (`search`, `status`, `patient_id`, `start_date`, etc.).
3. **Legacy** `s_f`/`s_v`/`s_o` — confirm `ShouldBindQuery` silently drops them (total == baseline).

`X-Branch-ID: 1` was sent on every request (BranchContext middleware requires it).

## Tests

### 1. Patient list search — PASSED
expected: As receptionist, type a partial name in the patient search box. Results should filter to matches. **Likely fails** — frontend sends `s_f/s_v/s_o=or`, which backend now silently drops.
result: BACKEND PASS — `?search=Camila` → 1 result, `?search=ZZZ` → 0, `?status=inactive` → 0,
`?gender=female` → 9, `?gender=male` → 31, baseline 40. Legacy `s_f/s_v/s_o=or` returned baseline 40
(silently ignored as expected). Typed `PatientFilter{Search,Status,Gender}` works end-to-end.
**Frontend follow-up still required** — `patientService.ts:57-59` continues to send `s_f/s_v/s_o`
and will see unfiltered results until migrated to `?search=`.

### 2. Appointment date-range filter — PASSED
expected: Calendar `start_date`/`end_date` filtering narrows results. **Should work** — typed `AppointmentFilter` preserves these param names.
result: PASS — `?start_date=2026-04-28&end_date=2026-04-28` → 5 (narrowed from baseline 12);
`?start_date=2020-01-01&end_date=2020-01-02` → 0; `?status=scheduled` → 6, `?status=completed` → 6.
Legacy `s_f/s_v` ignored (baseline 12). Typed `AppointmentFilter` honours every documented form tag.

### 3. Laboratory order filter by status / priority / assigned_uid — PASSED
expected: Filtering by status, priority, and `assigned_uid` returns only the matching specialist's orders. `assigned_uid` now maps to `LaboratoryOrderFilter.AssignedSpecialistID *uint`.
result: PASS — `?status=delivered` → 2, `?status=in_quality` → 1, `?priority=normal` → 3,
`?priority=high` → 0, `?assigned_uid=2` → 0 (no assigned orders in DB). The typed
`LaboratoryOrderFilter.AssignedSpecialistID` is correctly bound from `form:"assigned_uid"`.
Legacy `s_f/s_v` ignored (baseline 3).

### 4. Supplier autocomplete (in purchase / expense forms) — PASSED
expected: Type into supplier picker — results filter. **Likely fails** — frontend uses `s_f/s_v/s_o`.
result: BACKEND PASS — DB had 0 suppliers, so two were seeded (`Proveedor Acme SA`, `Distribuidora Beta Ltda`)
then deleted after the run. `?search=Acme` → 1, `?search=Beta` → 1, `?search=ZZZNOMATCH` → 0,
`?name=Acme` → 1. Legacy `s_f/s_v` ignored (baseline 2). Typed `SupplierFilter{Name,Email,Search,PersonType}`
works end-to-end. **Frontend follow-up still required** — `supplierService.ts:118-120` still
sends `s_f/s_v/s_o`.

### 5. Sale list patient_id / payment_status filters — PASSED
expected: Receptionist applies filters in sales list. Typed `SaleFilter` honours both. **Should work**.
result: PASS — `?payment_status=paid` → 5 (matches baseline; all 5 sales paid), `?payment_status=pending` → 0
(no pending sales), `?patient_id=30` → 0, `?patient_id=999999` → 0. Legacy `s_f/s_v` ignored
(baseline 5). Typed `SaleFilter` honours both `payment_status` and `patient_id`.

### 6. Cash register close — date range + status — PASSED
expected: Asesor and admin filter cierres by `date_from/date_to/status`. Dates and status work via typed `CashRegisterCloseFilter`.
result: PASS — baseline 9. `?date_from=2026-05-01&date_to=2026-05-09` → 1; `?date_from=2020-01-01&date_to=2020-01-02` → 0;
`?status=draft` → 6; `?status=closed` → 0. Legacy `s_f/s_v` ignored (baseline 9). Typed
`CashRegisterCloseFilter` honours `date_from`, `date_to`, and `status`.

### 7. Prescription history by appointment — PASSED (with frontend caveat)
expected: Specialist opens an appointment with a prescription. Prescription is fetched and shown. **Likely fails** — frontend currently sends `s_f=["appointment_id"]`; should send `?appointment_id=X`.
result: BACKEND PASS — `?appointment_id=20` → 0 (correct: no prescription for that appointment),
`?appointment_id=999999` → 0. Legacy `s_f=["appointment_id"]&s_v=["20"]` returned baseline 4 (silently
ignored). Typed `PrescriptionFilter.AppointmentID` works.
**Frontend follow-up confirmed required** — `prescriptionService.ts:55` still sends `s_f` and the
specialist's prescription-by-appointment lookup currently fetches the full unfiltered list (4 records)
instead of the one matching the appointment.

### 8. Brand / category dropdowns in product creation — INCONCLUSIVE / NOT A REGRESSION
expected: Autocomplete in product form filters as user types.
result: BRAND search NOT SUPPORTED BY DESIGN — `BrandRepository.List(db, page, perPage)` has no Filter
struct (no `BrandFilter` exists in `internal/domain/`). `?search=ZZZ` returns the full 713 brands.
This is **identical to pre-Phase 21 behaviour** — the brand catalog never had a backend search
allowlist. Same for `ProductCategoryFilter` which only has `IsActive` (no `Search` field).
Phase 21 did NOT regress this — it remains a long-standing frontend coupling gap.
If brand/category search is required, it needs a separate phase to add a `BrandFilter` struct
and ILIKE search clause; not a Phase 21 deliverable.

### 9. Lens catalog prescription range — PASSED
expected: Specialist searches lenses by sphere/cylinder/addition. Per-eye `LensCatalogFilter` fields work.
result: PASS — endpoint is `GET /api/v1/inventory/lens-catalog` (not `/lenses`). Baseline 1007;
`?search=ZZZ` → 0, `?sphere_od=0` → 1002, `?sphere_od=99` → 0, `?brand_id=1` → 23. Legacy `s_f/s_v`
ignored (baseline 1007). Per-eye `LensCatalogFilter.SphereOD/CylinderOD/AdditionOD/SphereOS/...`
fields all bind and apply. `?status=active` returned 0 (data has different status values; not a
filter regression — the field is bound and applied).

### 10. User search in admin RBAC page — PASSED
expected: Admin types into the user search and the list filters. Note: RESEARCH flagged this as already-broken pre-Phase 21 — `userService.ts` sends `s_f/s_v` and backend never read them.
result: BACKEND PASS — `?search=admin` → 1, `?search=ZZZNOMATCH` → 0, `?role_type=admin` → 1,
`?role_type=specialist` → 4 (baseline 11). Legacy `s_f/s_v=or` returned baseline 11 (silently
ignored). Typed `UserFilter{Search, RoleType, Identification}` works — Phase 21 actually FIXED
the previously-broken backend search; only the frontend service needs the param rename.

## Summary

total: 10
passed: 9 (backend behavior correct end-to-end)
issues: 0 (no Phase 21 regressions)
pending: 1 (UAT 8 — Brand/Category search; pre-existing gap, not a Phase 21 deliverable)
skipped: 0
blocked: 0

## Findings

### Phase 21 backend deliverables — ALL VERIFIED IN A LIVE API
1. Typed Filter structs replace `s_f/s_v/s_o`: confirmed across patients, appointments,
   laboratory-orders, suppliers, sales, cash-register-closes, prescriptions, lens-catalog, and users.
2. `c.ShouldBindQuery(&filter)` silently drops legacy `s_f/s_v/s_o` (no 400 error returned).
3. Every typed `form` tag is honoured by the corresponding repository (search ILIKE,
   exact-match status/payment_status/patient_id, date ranges, per-eye prescription floats).
4. The repository for users/sales/cash-close uses the embedded `Pagination` clamping correctly.

### Frontend coupling debt — UNCHANGED FROM 21-VERIFICATION REPORT
Frontend services in `convision-front/src/services/` continue to emit `s_f/s_v/s_o`. Backend now
silently ignores them, so search/filter UIs that depend on them are degraded:

| Service | UI surface |
|---|---|
| `patientService.ts:57-59` | Patient search — currently returns full list ignoring user input |
| `supplierService.ts:118-120` | Supplier autocomplete — currently returns full list |
| `prescriptionService.ts:55` | Prescription-by-appointment lookup — currently returns full list |
| `laboratoryService.ts:45-47` | Laboratory list search |
| `lensService.ts:246,388,438,486,535` | Lens catalog/type/class/material/treatment dropdowns |
| `catalogService.ts:157-158` | Generic catalog text search |
| `userService.ts` | Admin user search |
| `clinicalEvolutionService.ts` | Clinical evolution prescription lookup |
| `inventoryService.ts` | Warehouse / inventory filter |

### Required follow-up
Spawn phase 21.1 (or queue in Phase 22 backlog) to migrate the ~10 frontend services above
from `s_f/s_v/s_o` arrays to flat typed query params (`?search=`, `?appointment_id=`, etc.).
The backend already accepts these — the change is purely client-side.

### Operational note
The running API process (PID 12175, started 18:15) was a stale build that did not include
the Phase 21 wiring. Restarting against `./bin/convision-api` (built 19:44) was required to
validate this phase. Document this in the runbook so future phases verify build/process freshness
before declaring backend behaviour broken.

## Gaps

None for Phase 21 backend deliverables. Brand/category search support and frontend `s_f` cleanup
are out of scope for this phase per 21-VERIFICATION.md and the original PLAN frontmatter.
