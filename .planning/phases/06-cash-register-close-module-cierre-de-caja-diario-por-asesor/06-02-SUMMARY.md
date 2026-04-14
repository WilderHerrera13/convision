---
phase: "06"
plan: "02"
subsystem: backend
tags: [daily-activity-report, advisor-report, api, laravel]
dependency_graph:
  requires: [06-01]
  provides: [daily-activity-reports-api]
  affects: [routes/api.php]
tech_stack:
  added: []
  patterns: [ApiFilterable, Laravel API Resources, Form Request validation, Service layer]
key_files:
  created:
    - convision-api/database/migrations/2026_04_14_000004_create_daily_activity_reports_table.php
    - convision-api/app/Models/DailyActivityReport.php
    - convision-api/app/Services/DailyActivityReportService.php
    - convision-api/app/Http/Requests/Api/V1/DailyActivityReport/StoreDailyActivityReportRequest.php
    - convision-api/app/Http/Requests/Api/V1/DailyActivityReport/UpdateDailyActivityReportRequest.php
    - convision-api/app/Http/Resources/V1/DailyActivityReport/DailyActivityReportResource.php
    - convision-api/app/Http/Resources/V1/DailyActivityReport/DailyActivityReportCollection.php
    - convision-api/app/Http/Controllers/Api/V1/DailyActivityReportController.php
  modified:
    - convision-api/routes/api.php
decisions:
  - Use role string comparison (->role !== 'admin') consistent with existing controllers; no hasRole() method exists in this project
  - Removed typed Request parameter from toArray() signatures to match Laravel 8 parent compatibility under PHP 8.5
  - Totales (total_preguntas, total_consultas_efectivas) included in Resource response for convenience
  - canEdit() in service restricts non-admin advisors to editing only today's own reports
metrics:
  duration_minutes: 18
  completed_date: "2026-04-14"
  tasks_completed: 5
  files_created: 8
  files_modified: 1
---

# Phase 06 Plan 02: Backend — Reporte Diario de Gestión del Asesor Summary

**One-liner:** Full CRUD backend for advisor daily activity reports with role-based access, unique-per-shift constraint, and structured nested API response.

## What Was Built

A complete Laravel backend for the advisor daily activity report module:

- **Migration** `daily_activity_reports`: 36 metric columns across attendance (H/M/N breakdown), operations, and social media categories; unique constraint on `(user_id, report_date, shift)` prevents duplicate reports per advisor per day per shift.
- **Model** `DailyActivityReport`: `ApiFilterable` trait, full `$fillable`, date cast for `report_date`, `decimal:2` cast for `valor_ordenes`, `belongsTo(User)` relationship, and two helper total-calculation methods.
- **Service** `DailyActivityReportService`: `create()`, `update()`, and `canEdit()` — non-admin advisors may only edit their own reports from the current day.
- **Form Requests**: `StoreDailyActivityReportRequest` (required `report_date`/`shift`, all metrics nullable) and `UpdateDailyActivityReportRequest` (same fields with `sometimes` prefix).
- **API Resources**: `DailyActivityReportResource` returns grouped nested structure (`atencion`, `operaciones`, `redes_sociales`) with calculated `totales`; `DailyActivityReportCollection` extends `ResourceCollection`.
- **Controller** `DailyActivityReportController`: `index`/`show`/`store`/`update`; admin sees all records, advisors see only their own; 403 abort on unauthorized access; pagination capped at 100.
- **Route**: `apiResource daily-activity-reports` excluding `destroy`, protected by `auth:api` middleware.

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create migration | fad3573 |
| 2 | Create model | 4169596 |
| 3 | Create service | f888bfe |
| 4 | Create Form Requests + Resources | db0d1af |
| 5 | Create controller + register routes | 067350a |

## Success Criteria Verification

- [x] Migración `daily_activity_reports` ejecuta sin error — migrated successfully
- [x] Model `DailyActivityReport` con ApiFilterable y relación a User — confirmed via tinker
- [x] Asesor puede crear/actualizar solo sus propios reportes — enforced in controller (403 on mismatch)
- [x] No se puede crear más de un reporte por asesor por fecha y jornada — unique DB constraint on (user_id, report_date, shift)
- [x] Admin puede listar todos los reportes con filtros por asesor y fecha — apiFilter applied, no user_id restriction for admin
- [x] Resource retorna todos los campos incluyendo totales calculados — `totales` block in DailyActivityReportResource

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Incompatible toArray() type hint with Laravel 8 parent**
- **Found during:** Task 4 verification
- **Issue:** `toArray(Request $request): array` (strict typed) fails under PHP 8.5 as incompatible with parent `toArray($request)` signature
- **Fix:** Changed to `toArray($request): array` matching existing resources in the codebase
- **Files modified:** `DailyActivityReportResource.php`, `DailyActivityReportCollection.php`
- **Commit:** db0d1af

**2. [Rule 2 - Consistency] Role checks use string comparison not hasRole()**
- **Found during:** Task 5 implementation
- **Issue:** Plan used `auth()->user()->hasRole('admin')` but no such method exists; project uses `->role !== 'admin'`
- **Fix:** Applied `auth()->user()->role !== 'admin'` consistently with existing controllers
- **Files modified:** `DailyActivityReportController.php`
- **Commit:** 067350a

## Known Stubs

None — all endpoints return live DB data.

## Self-Check: PASSED

- [x] `convision-api/database/migrations/2026_04_14_000004_create_daily_activity_reports_table.php` — EXISTS
- [x] `convision-api/app/Models/DailyActivityReport.php` — EXISTS
- [x] `convision-api/app/Services/DailyActivityReportService.php` — EXISTS
- [x] `convision-api/app/Http/Requests/Api/V1/DailyActivityReport/StoreDailyActivityReportRequest.php` — EXISTS
- [x] `convision-api/app/Http/Requests/Api/V1/DailyActivityReport/UpdateDailyActivityReportRequest.php` — EXISTS
- [x] `convision-api/app/Http/Resources/V1/DailyActivityReport/DailyActivityReportResource.php` — EXISTS
- [x] `convision-api/app/Http/Resources/V1/DailyActivityReport/DailyActivityReportCollection.php` — EXISTS
- [x] `convision-api/app/Http/Controllers/Api/V1/DailyActivityReportController.php` — EXISTS
- [x] Commits fad3573, 4169596, f888bfe, db0d1af, 067350a — all present in git log
- [x] Endpoint `GET /api/v1/daily-activity-reports` returns `{"data":[],...}` paginado ✓
