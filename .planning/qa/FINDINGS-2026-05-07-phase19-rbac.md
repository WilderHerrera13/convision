---
status: completed
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-05-07T06:00:00-05:00
updated: 2026-05-07T12:30:00-05:00
roles_tested: [admin]
scope: phase-19 RBAC roles-permissions
---

# QA FINDINGS — Fase 19: RBAC Roles & Permisos

## Resumen ejecutivo

- Pantallas verificadas: login, /admin/dashboard, /admin/roles, /admin/users/:id/edit
- Hallazgos confirmados: 7 (todos corregidos en sesión)
- Hipótesis / pendiente evidencia: ninguna pendiente

---

## Hallazgos backend / seed

### QA-P19-001 ✅ CORREGIDO
- Rol: (todos)
- URL: backend — POST /api/v1/auth/login
- Severidad: **bloqueante**
- Observado: `permissions: []` — GORM creó columna `role_model_id` en lugar de `role_id` en `role_permissions`
- Fix: tag `joinForeignKey:RoleID;joinReferences:PermissionID` en `domain.RoleModel.Permissions`

### QA-P19-002 ✅ CORREGIDO
- Severidad: **bloqueante**
- Observado: `role_type = 'receptionist'` en todos los usuarios por default de AutoMigrate
- Fix: `UPDATE users SET role_type = role WHERE role_type = 'receptionist' AND role != 'receptionist'`

### QA-P19-003 ✅ CORREGIDO
- Severidad: **bloqueante**
- Observado: `GetUserPermissionKeys` usaba `s.db` global (search_path=public) → permisos vacíos
- Fix: Todas las methods del `role.Service` ahora aceptan `db *gorm.DB` (tenant-scoped); handlers pasan `tenantDBFromCtx(c)`

### QA-P19-004 ✅ CORREGIDO
- URL: GET /api/v1/auth/me
- Severidad: **bloqueante**
- Observado: 404 — `auth.Me()` usaba `s.db` global
- Fix: Firma cambiada a `Me(db *gorm.DB, userID uint)`; handler pasa `tenantDBFromCtx(c)`

### QA-P19-005 ✅ CORREGIDO
- URL: GET /api/v1/roles, GET /api/v1/permissions
- Severidad: **alto**
- Observado: arrays vacíos — `role.Service` usaba `s.db` global en todos los métodos
- Fix: Todos los métodos de `role.Service` (List, GetByID, Create, Update, Delete, ListAllPermissions, AssignRoleToUser, RemoveRoleFromUser) ahora aceptan `db *gorm.DB`

### QA-P19-006 ✅ CORREGIDO
- URL: GET /api/v1/users/:id/roles
- Severidad: **bloqueante** (frontend UserRolesSection)
- Observado: 404 — ruta no existía en el backend
- Fix: Añadida ruta `GET /users/:id/roles` con handler `GetUserRoles`, método en `role.Service.GetUserRoles`, y método `RoleRepository.GetUserRoles` en postgres

### QA-P19-007 ✅ CORREGIDO
- Middleware: `Authenticate` — token_version check
- Severidad: **bloqueante** (todos los endpoints protegidos devolvían 401)
- Observado: `globalDB.Table("users")` consultaba `public.users` (vacía); `tokenVer=0 != claims.TokenVersion=1` → 401
- Fix: Usa `claims.SchemaName + ".users"` como nombre de tabla qualified; skip para schema "platform"

---

## Hallazgos frontend

### QA-P19-008 ✅ CORREGIDO
- Página: /admin/roles — ruta no wired en App.tsx
- Severidad: **alto** — 404 en navegación
- Fix: Import de `RolesManagementPage` y ruta `{ path: "roles", element: <RolesManagementPage /> }` añadidos en App.tsx

### QA-P19-009 ✅ CORREGIDO
- Componente: AdminLayout.tsx — nav GESTIÓN sin item "Roles y Permisos"
- Severidad: **medio** — funcionalidad inaccesible desde sidebar
- Fix: `{ title: 'Roles y Permisos', path: '/admin/roles', icon: ShieldCheck }` añadido

### QA-P19-010 ✅ CORREGIDO
- Página: /admin/users/:id/edit — UserRolesSection no integrada
- Severidad: **alto** — gestión de roles por usuario inaccesible
- Fix: Prop `renderAfter` añadida a `UserFormShell`; `UserRolesSection` integrada en `UserEditPage`

### QA-P19-011 ✅ CORREGIDO
- Componente: RoleFormDialog — `<Checkbox>` (renders as `<button>`) nested inside `<AccordionTrigger>` (also `<button>`)
- Severidad: **medio** — violación DOM nesting; diálogo funciona pero con comportamiento inconsistente
- Fix: Reemplazado `AccordionTrigger` de shadcn por `AccordionPrimitive.Header` + `AccordionPrimitive.Trigger` de Radix, con Checkbox como hermano del trigger

---

## Validación final

| Endpoint | Status | Notas |
|----------|--------|-------|
| POST /api/v1/auth/login (admin) | ✅ 200 | 111 permisos en JWT |
| POST /api/v1/auth/login (specialist) | ✅ 200 | 30 permisos en JWT |
| POST /api/v1/auth/login (receptionist) | ✅ 200 | 48 permisos en JWT |
| GET /api/v1/auth/me | ✅ 200 | Retorna usuario del schema tenant |
| GET /api/v1/roles | ✅ 200 | 4 roles con permisos |
| GET /api/v1/permissions | ✅ 200 | 111 permisos |
| GET /api/v1/users/1/roles | ✅ 200 | 1 rol (Administrador) |
| GET /api/v1/users/1/permissions | ✅ 200 | 111 permisos |
| GET /api/v1/roles/1 | ✅ 200 | Rol con 111 permisos |
| /admin/dashboard | ✅ carga | Sin errores consola |
| /admin/roles | ✅ carga | Tabla con 4 roles |
| /admin/roles → Nuevo Rol dialog | ✅ abre | 35 módulos accordion |
| /admin/users/1/edit | ✅ carga | UserRolesSection muestra "Administrador" |

---

## Pendiente (no bloqueante)

- Labels de módulos en RoleFormDialog están en inglés (appointments, branches, etc.) — los permission keys vienen del backend en inglés. P2 UX.
- specialist/receptionist login flow (branch selector) — no validado en navegador en esta sesión
- Token invalidation smoke test cuando roles cambian — no ejecutado

---

## Archivos modificados (backend)

| Archivo | Cambio |
|---------|--------|
| `internal/domain/role.go` | GORM join tags + interface `GetUserRoles` |
| `internal/role/service.go` | Todos los métodos aceptan `db *gorm.DB`; `GetUserRoles` añadido |
| `internal/platform/storage/postgres/role_repository.go` | `GetUserRoles` implementado |
| `internal/platform/auth/middleware.go` | token_version usa tabla schema-qualified |
| `internal/auth/service.go` | `Me`, `Refresh` usan tenant DB |
| `internal/transport/http/v1/handler.go` | `Me` pasa `tenantDBFromCtx(c)` |
| `internal/transport/http/v1/handler_role.go` | Todos los handlers pasan tenant DB; `GetUserRoles` añadido |
| `internal/transport/http/v1/routes.go` | `GET /users/:id/roles` añadido |

## Archivos modificados (frontend)

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Import `RolesManagementPage` + ruta `/admin/roles` |
| `src/layouts/AdminLayout.tsx` | Nav item "Roles y Permisos" en sección GESTIÓN |
| `src/pages/admin/users/UserFormShell.tsx` | Prop `renderAfter?: React.ReactNode` |
| `src/pages/admin/users/UserEditPage.tsx` | `UserRolesSection` integrada via `renderAfter` |
| `src/pages/admin/RoleFormDialog.tsx` | Fix button-in-button: Radix primitives directos |
