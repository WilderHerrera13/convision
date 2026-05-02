---
phase: 16
plan: 06
status: complete
---

# 16-06 Summary — Frontend Super Admin UI + Feature Flags

## What was built

All 9 tasks completed:

1. `src/types/optica.ts` — `Optica`, `CreateOpticaInput`, `UpdateOpticaInput`, `OpticaFeature`, `FeatureToggle` interfaces.
2. `src/services/superAdmin.ts` — `superAdminService` with `getForTable`, `createOptica`, `getOptica`, `updateOptica`, `listFeatures`, `bulkUpdateFeatures`, `toggleFeature`, `listFeatureKeys`.
3. `src/types/user.ts` — Added `'super_admin'` to role union, added `feature_flags?: string[]`.
4. `src/contexts/AuthContext.tsx` — Added `super_admin` ROLE_COLORS, `super_admin` login navigation, exported `useFeature(key)` hook.
5. `src/layouts/SuperAdminLayout.tsx` — Dark theme sidebar (`#1a1a2e`) with Ópticas nav, `Outlet`, logout.
6. `src/pages/super-admin/OpticasPage.tsx` — `EntityTable<Optica>` with `emptyStateNode` (Building2 icon, `#1a1a2e` accent) and `filterEmptyStateNode` (table-filter variant). Plan labels in Spanish.
7. `src/pages/super-admin/OpticaCreatePage.tsx` — React Hook Form + Zod. Fields: name, slug (regex `[a-z0-9_]+`), plan (SearchableCombobox), admin.name/email/password (min 6 chars). Navigates to detail on success.
8. `src/pages/super-admin/OpticaDetailPage.tsx` — Optica info + 12-feature-flag toggle grid (Switch). Each toggle calls `toggleFeature`. Info note: "Los cambios tomarán efecto cuando el usuario vuelva a iniciar sesión."
9. `src/layouts/AdminLayout.tsx` — Added `featureKey?` to `NavItem`, imported `useFeature`, called all 12 feature hooks upfront, filtered `adminNav` sections before render. Items without `featureKey` always visible (Dashboard, Pacientes, Sedes, Usuarios, Proveedores, Laboratorios, etc.).
10. `src/App.tsx` — Added `/super-admin` route group with `ProtectedRoute allowedRoles=['super_admin']`. Updated `PublicRoute` and `HomePage` to redirect `super_admin` → `/super-admin/opticas`.

## Deviations

- `AdminLayout` feature filtering applied only to `adminNav` (not receptionist/specialist nav), matching the plan scope.
- `filterNavSections` skips entire sections if all their items are filtered out (avoids empty section headers).
- `OpticasPage` uses `toolbarLeading`/`toolbarTrailing` pattern (matches existing `UsersListPage` style) instead of a separate header div.

## Build

`npm run build` succeeds (7.13s). No lint errors in new/modified files.
