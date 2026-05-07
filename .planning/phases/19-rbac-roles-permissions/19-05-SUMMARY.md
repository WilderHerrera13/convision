---
plan: 19-05
title: "Frontend component refactoring + RolesManagementPage + UserRolesSection"
status: completed
---

## What was done

**New files:**
- `convision-front/src/pages/admin/RolesManagementPage.tsx` — EntityTable with CRUD for roles (create/edit/delete), guarded for system roles
- `convision-front/src/pages/admin/RoleFormDialog.tsx` — Create/Edit dialog with permission matrix (Accordion per module, Checkbox per action, toggle-all per module)
- `convision-front/src/pages/admin/users/UserRolesSection.tsx` — Role assignment UI with badges, X-to-remove, SearchableCombobox to add roles, effective permissions grid
- `convision-front/src/services/roles.ts` — Full API service: getRoles, getRole, createRole, updateRole, deleteRole, getPermissions, assignRole, removeRole, getUserPermissions, getUserRoles, getForTable

**Backend additions:**
- `domain.RoleRepository.GetUserRoles` interface method
- `role_repository.GetUserRoles` — queries via JOIN on user_roles, preloads Permissions
- `role.Service.GetUserRoles` — delegates to repo
- `handler_role.GetUserRoles` — GET /api/v1/users/:id/roles handler
- Route registered: `GET /users/:id/roles` with `roles_permissions:manage` guard

**Modified files:**
- `AdminLayout.tsx` — Added "Roles y Permisos" nav item (ShieldCheck icon) to GESTIÓN section
- `App.tsx` — Navigation/routing uses `role_type ?? role` for branching logic (BranchProtectedRoute, SelectBranchGuard, PublicRoute, HomePage)
- `UserFormShell.tsx` — Added optional `belowContent` slot rendered between form grid and footer
- `UserEditPage.tsx` — Passes `<UserRolesSection userId={userId} />` as `belowContent`
- Route `/admin/roles` added to App.tsx router config

## Build verification
- `make build` (backend): exits 0
- `npm run build` (frontend): exits 0
