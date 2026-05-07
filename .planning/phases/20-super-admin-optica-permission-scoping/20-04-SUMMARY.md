---
plan: 20-04
status: complete
completed: 2026-05-07
---

## What Was Built

A "Permisos" tab added to the OpticaDetailPage in the super-admin frontend, backed by a new service and panel component. The super admin can now view and update the allowed permission set for any optica through an accordion-based matrix UI.

## Key Files

### Created
- `convision-front/src/services/opticaPermissions.ts` — service with `getOpticaPermissions`, `updateOpticaPermissions`, `getAllPermissions` using `ApiService` (consistent with superAdmin.ts pattern)
- `convision-front/src/pages/super-admin/OpticaPermissionsPanel.tsx` — accordion panel component; one AccordionItem per module, checkboxes per action, "Seleccionar todo" / "Limpiar" buttons per module, "Guardar permisos" button with toast feedback

### Modified
- `convision-front/src/pages/super-admin/OpticaDetailPage.tsx` — extended `type Tab` to include `'permissions'`; added `{ key: 'permissions', label: 'Permisos' }` tab entry; added `<OpticaPermissionsPanel opticaId={opticaId} />` conditional render block; added import

## Decisions Made

- Used `ApiService` (not raw `api` from `@/lib/axios`) to match the existing superAdmin.ts pattern — ApiService provides consistent error translation and toast-free error propagation.
- Button `size="xs"` does not exist in this project's shadcn Button; used `size="sm"` with custom `h-[28px]` class override for the module-level "Seleccionar todo" / "Limpiar" buttons.
- Empty `permission_keys: []` from the API is treated as "no restrictions" — all checkboxes are checked. On save, if all are checked, `[]` is sent back (round-trip safe).
- The panel renders inside the same card/panel layout pattern as the Modules and Admins tabs (rounded border card with sidebar info panel), keeping visual consistency.
- Used React Query `useQuery` for both data fetches and `useMutation` for the save, consistent with other super-admin tab components.

## Self-Check

- [x] All tasks executed
- [x] Each task committed individually
- [x] `npm run build` exits 0
- [x] `opticaPermissions.ts` has all three required functions
- [x] `OpticaPermissionsPanel` contains Accordion, Checkbox, selectedKeys Set, empty-array = all-checked logic
- [x] `OpticaDetailPage` Tab type includes `'permissions'`, tab renders `<OpticaPermissionsPanel>`
- [x] SUMMARY.md created
