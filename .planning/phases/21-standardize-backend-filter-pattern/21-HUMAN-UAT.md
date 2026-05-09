---
status: partial
phase: 21-standardize-backend-filter-pattern
source: [21-VERIFICATION.md]
started: 2026-05-08T00:00:00Z
updated: 2026-05-08T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Patient list search
expected: As receptionist, type a partial name in the patient search box. Results should filter to matches. **Likely fails** — frontend sends `s_f/s_v/s_o=or`, which backend now silently drops.
result: [pending]

### 2. Appointment date-range filter
expected: Calendar `start_date`/`end_date` filtering narrows results. **Should work** — typed `AppointmentFilter` preserves these param names.
result: [pending]

### 3. Laboratory order filter by status / priority / assigned_uid
expected: Filtering by status, priority, and `assigned_uid` returns only the matching specialist's orders. `assigned_uid` now maps to `LaboratoryOrderFilter.AssignedSpecialistID *uint`.
result: [pending]

### 4. Supplier autocomplete (in purchase / expense forms)
expected: Type into supplier picker — results filter. **Likely fails** — frontend uses `s_f/s_v/s_o`.
result: [pending]

### 5. Sale list patient_id / payment_status filters
expected: Receptionist applies filters in sales list. Typed `SaleFilter` honours both. **Should work**.
result: [pending]

### 6. Cash register close — date range + status
expected: Asesor and admin filter cierres by `date_from/date_to/status`. Dates and status work via typed `CashRegisterCloseFilter`.
result: [pending]

### 7. Prescription history by appointment
expected: Specialist opens an appointment with a prescription. Prescription is fetched and shown. **Likely fails** — frontend currently sends `s_f=["appointment_id"]`; should send `?appointment_id=X`.
result: [pending]

### 8. Brand / category dropdowns in product creation
expected: Autocomplete in product form filters as user types.
result: [pending]

### 9. Lens catalog prescription range
expected: Specialist searches lenses by sphere/cylinder/addition. Per-eye `LensCatalogFilter` fields work.
result: [pending]

### 10. User search in admin RBAC page
expected: Admin types into the user search and the list filters. Note: RESEARCH flagged this as already-broken pre-Phase 21 — `userService.ts` sends `s_f/s_v` and backend never read them.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
