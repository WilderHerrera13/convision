# Plan 11-05 Summary — Specialist Agenda & Appointment Detail Pages

## Status: COMPLETE

## Tasks Completed

### Task 1 — appointmentService.ts (new named-export service)
- Created `convision-front/src/services/appointmentService.ts` with named exports:
  - `takeAppointment`, `pauseAppointment`, `resumeAppointment`, `completeAppointment`
  - `getActiveAppointment`, `getAppointmentById`, `getAppointmentsBySpecialist`
- Exported `Appointment` interface (with `started_at`, `completed_at`, nested `patient`, `specialist`) and `PaginatedResult<T>` generic
- Uses `@/lib/axios` and `api/v1/` prefix consistent with project conventions

### Task 2 — SpecialistAppointmentsPage
- Created `convision-front/src/pages/specialist/SpecialistAppointmentsPage.tsx`
- KPI cards: "Citas hoy", "En curso" (green `#0f8f64`), "Completadas"
- Filters: date picker, patient search, status select
- `AppointmentCard` inline component with status color chips
- React Query key `['specialist-appointments', date, search, statusFilter]`
- Handles both `full_name` and `first_name + last_name` patient shapes

### Task 3 — SpecialistAppointmentDetailPage
- Created `convision-front/src/pages/specialist/SpecialistAppointmentDetailPage.tsx`
- `useElapsedTimer` hook: live HH:MM:SS counter while `status === 'in_progress'`
- Lifecycle buttons by status:
  - `scheduled` → "Tomar cita"
  - `in_progress` → "Pausar" + "Completar"
  - `paused` → "Reanudar" + "Completar"
- `ConflictModal`: shown on 409 / `appointment_in_progress` error type; options to pause-and-take or go to active appointment
- Tab bar (`Resumen`, `Historia clínica`, `Anotaciones`, `Evolución`, `Prescripción`, `Notas internas`) visible only when `in_progress` or `paused`
- "Historia clínica" tab links to `/specialist/patients/:id/history`; "Prescripción" tab links to `/specialist/prescriptions/create`
- Error handling via `useToast` (shadcn toast), consistent with existing specialist pages

### Task 4 — App.tsx route registration
- Added imports for `SpecialistAppointmentsPage` and `SpecialistAppointmentDetailPage`
- Replaced `/specialist/appointments` (was `<Appointments />`) → `<SpecialistAppointmentsPage />`
- Replaced `/specialist/appointments/:id` (was `<SpecialistAppointmentDetail />`) → `<SpecialistAppointmentDetailPage />`
- Admin routes for `/admin/appointments/*` still use the old generic components unchanged

### Task 5 — Build verification
- `npm run build` passed with **0 TypeScript errors**
- Bundle: 14607 modules, 2861 kB JS (only size warning, no errors)

## Key Design Decisions
- `appointmentService.ts` (singular) created alongside existing `appointmentsService.ts` (plural/object-style) to avoid breaking existing pages
- `getAppointmentsBySpecialist` uses `start_date`/`end_date` params matching the existing Go backend API
- `getAppointmentById` response handled as `Appointment` directly (no `data` wrapper) matching existing service behavior
- Conflict detection uses both HTTP 409 status and `error_type === 'appointment_in_progress'` for robustness
- Timer auto-refetches appointment every 30s when in_progress to sync backend state changes

## Files Changed
- `convision-front/src/services/appointmentService.ts` (created)
- `convision-front/src/pages/specialist/SpecialistAppointmentsPage.tsx` (created)
- `convision-front/src/pages/specialist/SpecialistAppointmentDetailPage.tsx` (created)
- `convision-front/src/App.tsx` (updated — specialist appointment routes)

## Commits
1. `feat(11-05): add appointment lifecycle service methods`
2. `feat(11-05): create SpecialistAppointmentsPage with KPI cards and list`
3. `feat(11-05): create SpecialistAppointmentDetailPage with lifecycle actions and timer`
4. `feat(11-05): register specialist appointment routes in App.tsx`
