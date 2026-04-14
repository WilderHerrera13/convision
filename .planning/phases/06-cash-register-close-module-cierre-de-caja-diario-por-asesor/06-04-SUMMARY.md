---
phase: 6
plan: 4
subsystem: frontend-admin
tags: [admin, cash-close, daily-reports, react, typescript]
dependency_graph:
  requires: [06-01, 06-02, 06-03]
  provides: [admin-cash-close-views, admin-daily-report-views]
  affects: [AdminLayout, App.tsx]
tech_stack:
  added: []
  patterns: [EntityTable, DatePicker, Sheet, PageLayout, React Query]
key_files:
  created:
    - convision-front/src/pages/admin/CashCloses.tsx
    - convision-front/src/pages/admin/CashCloseDetail.tsx
    - convision-front/src/pages/admin/DailyReports.tsx
  modified:
    - convision-front/src/App.tsx
    - convision-front/src/layouts/AdminLayout.tsx
decisions:
  - Used sonner toast for approve/return actions in CashCloseDetail (consistent with newer admin pages)
  - Extended CashClose and DailyActivityReport interfaces locally with optional user field to handle API relationship
  - CashCloseDetail subtitle renders Badge via PageLayout subtitle prop (React node as string cast)
  - Stats computed via separate React Query with per_page=200 to avoid coupling with EntityTable pagination
metrics:
  duration_minutes: 25
  completed_date: "2026-04-13"
  tasks_completed: 4
  files_created: 3
  files_modified: 2
---

# Phase 6 Plan 4: Frontend — Vistas del Admin Summary

**One-liner:** Admin views for cash register closes and daily reports with approval workflow, filters, and Sheet side panel.

## What Was Built

### Task 1 — AdminCashCloses (`CashCloses.tsx`)
- Stats cards row: total closes in period, pending review count (amber), accumulated difference (red)
- Filter bar: DatePicker (Desde/Hasta), Select Asesor (from `/api/v1/users`), Select Estado
- EntityTable with columns: Fecha | Asesor | Total Registrado | Total Contado | Diferencia | Estado | Acciones
- Color-coded difference (red for negative/falta, green for positive/sobra)
- Status badges: Borrador (gray), Enviado (amber), Aprobado (green)
- Eye button navigates to `/admin/cash-closes/:id`

### Task 2 — AdminCashCloseDetail (`CashCloseDetail.tsx`)
- Breadcrumb with back link to `/admin/cash-closes`
- Stat cards: Total Registrado (blue), Total Contado (green), Diferencia with FALTA/SOBRA badge (red)
- Read-only payment methods table with per-method difference and totals row in blue
- Approval panel (amber, shown when `status === 'submitted'`): textarea for admin_notes + Aprobar / Devolver buttons
- "Aprobado" card shown when status is approved, displaying admin_notes if present
- `cashRegisterCloseService.approve()` called for both approve and return flows

### Task 3 — AdminDailyReports (`DailyReports.tsx`)
- Filter bar: DatePicker (Desde/Hasta), Select Asesor, Select Jornada
- EntityTable: Fecha | Asesor | Jornada | Total Preguntas | Consultas Efectivas | Valor Órdenes | Acciones
- Jornada badges: Mañana (blue), Tarde (amber), Completa (green)
- Eye button opens Sheet (shadcn) side panel with full report detail
- Sheet shows 3 sections: Atención al Cliente, Operaciones, Redes Sociales

### Task 4 — Routing & Navigation
- `App.tsx`: added `/admin/cash-closes`, `/admin/cash-closes/:id`, `/admin/daily-reports` routes under admin children
- `AdminLayout.tsx`: added "Cierres de Caja" (ClipboardList icon) and "Reportes Diarios" (BarChart3 icon) to ADMINISTRACIÓN section

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 5885790 | feat(06-04): create admin CashCloses list page |
| 2 | 8d09909 | feat(06-04): create admin CashCloseDetail page |
| 3 | fc5e07c | feat(06-04): create admin DailyReports list page |
| 4 | dba9d33 | feat(06-04): add admin routes and sidebar nav for cash close module |

## Deviations from Plan

### Auto-added

**1. [Rule 2 - Missing functionality] Separate stats query for CashCloses**
- **Found during:** Task 1
- **Issue:** EntityTable manages its own pagination internally; no way to access all-items data for stats computation
- **Fix:** Added separate `statsQuery` using React Query with `per_page: 200` to compute period stats independently
- **Files modified:** `CashCloses.tsx`

**2. [Rule 2 - Missing functionality] Local interface extensions for user relationship**
- **Found during:** Tasks 1, 2, 3
- **Issue:** `CashClose` and `DailyActivityReport` interfaces in services don't include the `user` relationship returned by the admin API
- **Fix:** Declared local `CashCloseWithUser` and `DailyReportWithUser` interface extensions with optional `user` field
- **Files modified:** `CashCloses.tsx`, `CashCloseDetail.tsx`, `DailyReports.tsx`

## Known Stubs

None — all data is wired to real API endpoints via `cashRegisterCloseService` and `dailyActivityReportService`.

## Threat Flags

None — no new API endpoints introduced; views are read-only (except approve action which calls existing endpoint).

## Self-Check

- [x] `convision-front/src/pages/admin/CashCloses.tsx` — exists ✓
- [x] `convision-front/src/pages/admin/CashCloseDetail.tsx` — exists ✓
- [x] `convision-front/src/pages/admin/DailyReports.tsx` — exists ✓
- [x] App.tsx routes registered — commits verified ✓
- [x] Build: `npm run build` — exit 0, no TypeScript errors ✓
- [x] Commits 5885790, 8d09909, fc5e07c, dba9d33 — all present ✓

## Self-Check: PASSED
