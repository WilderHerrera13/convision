# Phase 19: RBAC — Roles & Permissions - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning
**Source:** PRD Express Path (.planning/prd/19-rbac-roles-permissions.md)

<domain>
## Phase Boundary

Replace the single `role` column authorization with a fine-grained permission system:
- Introduce `roles`, `permissions`, `role_permissions`, and `user_roles` DB tables
- Rename `users.role` → `users.role_type` (preserved for UI theming only)
- Add `permissions: []string` to JWT claims
- Build `RequirePermission()` middleware alongside existing `RequireRole()`
- Replace ALL `RequireRole()` calls in `routes.go` with `RequirePermission()`
- Seed 4 system roles with 85+ permissions and assign to existing users
- Refactor frontend AuthContext to expose `hasPermission()` hook
- Replace ~50+ `user.role ===` checks across ~30 frontend files with `hasPermission()`
- Build admin `RolesManagementPage` at `/admin/roles` with full CRUD and permission matrix
- Add role assignment UI to user edit page
- Implement token version invalidation (no Redis required)

**Out of scope:** Role hierarchy/inheritance, time-based permissions, IP/geo restrictions, audit logging for permission changes, dynamic module registration.
</domain>

<decisions>
## Implementation Decisions

### Database Schema (Locked)
- Rename `users.role` → `users.role_type` (VARCHAR(30), CHECK constraint, default 'receptionist')
- New tables: `roles`, `permissions`, `role_permissions`, `user_roles`
- `roles.is_system: BOOLEAN` — system roles cannot be deleted
- `roles.is_default: BOOLEAN` — for auto-assignment
- `roles.name` has partial unique index `WHERE deleted_at IS NULL`
- `permissions` has composite unique constraint on `(module, action)`
- `role_permissions` and `user_roles` are join tables with composite PKs
- Soft delete on `roles` only (permissions are immutable once created)

### Permission Naming Convention (Locked)
- Format: `<module>:<action>` where action ∈ {view, create, edit, delete, manage, approve, export}
- 85+ permission keys listed in PRD Section 4.1
- Method `Key() string` on Permission entity returns `"module:action"`

### JWT Changes (Locked)
- New field `Permissions []string` in Claims struct
- New field `UserType domain.Role` for UI theming (renamed from Role)
- Keep existing `Role` field for backward compat during migration
- `GenerateToken()` signature gains `permissions []string` parameter
- `Login()` service loads user permissions via `roleService.GetUserPermissionKeys()` before generating token

### Middleware (Locked)
- `RequirePermission(permission string)` — checks single permission
- `RequireAnyPermission(permissions ...string)` — OR logic
- `RequireAllPermissions(permissions ...string)` — AND logic
- Both `RequireRole` and `RequirePermission` coexist during migration
- Implementation: O(1) map lookup from `Claims.Permissions`

### Token Invalidation (Locked)
- Add `token_version INT NOT NULL DEFAULT 1` to `users` table
- Include `token_version` in JWT claims
- Middleware checks `claims.TokenVersion == user.TokenVersion` (1 DB query on PK)
- When admin changes user roles → increment `token_version` → all existing tokens invalidated immediately
- No Redis required

### System Roles + Seed Data (Locked)
- 4 system roles: Administrador (all permissions), Especialista, Recepcionista, Laboratorio
- Exact permission sets defined in PRD Sections 4.2–4.5
- Seeder: INSERT 85 permissions → INSERT 4 system roles → INSERT role_permissions → map existing users by their role_type

### Routes Migration (Locked)
- Complete mapping table provided in PRD Section 5.7
- Replace `RequireRole` with `RequirePermission` per route group
- Admin-only routes use `roles_permissions:manage`

### Frontend AuthContext (Locked)
- `User` interface gains `permissions: string[]`
- `role` renamed to `role_type` (UI theming only)
- New methods: `hasPermission(permission)`, `hasAnyPermission(permissions)`, `hasAllPermissions(permissions)`
- Keep deprecated `isAdmin()`, `isSpecialist()`, `isReceptionist()` for transition

### Frontend Refactoring Map (Locked)
- Complete file-by-file mapping in PRD Section 7.4
- ~30 files with ~50+ checks to refactor
- Replace `user.role === 'admin'` with `hasPermission('...')`
- Keep `role_type` for theming only (colors, dashboard layout)

### Admin UI — RolesManagementPage (Locked)
- EntityTable listing: Name, Description, # Users, System Badge, Actions
- Create/Edit dialog: Name (text), Description (textarea), Permission matrix (accordion per module, checkboxes per action)
- Delete: confirmation with block on system roles
- System role badge: "Sistema"

### Admin UI — User Role Assignment (Locked)
- Show current roles as Badge components with X to remove
- "Add Role" button via SearchableCombobox
- Below roles: computed union of effective permissions

### Migration Strategy (Locked)
- Phase A: DB + Seed (no code changes)
- Phase B: Backend JWT + Middleware + Role CRUD handlers
- Phase C: Routes migration (one route group at a time)
- Phase D: Frontend AuthContext + `usePermission` hook
- Phase E: Frontend component refactoring (file by file)
- Phase F: Cleanup (remove deprecated code)

### Architecture (Locked)
- 3-layer: domain → service → transport
- `internal/domain/role.go` — Role, Permission structs + Repository interfaces
- `internal/role/service.go` — RoleService with CRUD + permission lookup
- `internal/platform/storage/postgres/role_repository.go` + `permission_repository.go`
- `internal/transport/http/v1/handler_role.go` — admin-only endpoints
- `internal/platform/auth/middleware.go` — new RequirePermission middlewares
- Wire in main.go: repos → roleService → handler

### the agent's Discretion
- Exact Go function signatures for repository methods beyond what is specified
- Detailed error message phrasing (in Spanish for frontend-facing messages)
- Specific logging levels and fields for Zap logger calls
- Exact pagination defaults for RolesManagementPage (use project standard 15)
- CSS/design specifics for RolesManagementPage layout (use shadcn/ui components + project Tailwind tokens)
- Order of files within each migration phase
- Whether to use a separate `usePermission` hook file vs inlining in AuthContext
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Conventions
- `AGENTS.md` — Project overview, architecture, commands, coding conventions
- `CLAUDE.md` — Golden rules (English-only code), backend/frontend architecture, AWS infra
- `.cursor/rules/convision-app.mdc` — DatePicker, EntityTable, API patterns, Laravel rules (legacy)

### Backend Architecture
- `convision-api-golang/DEVELOPMENT_GUIDE.md` — 3-layer architecture (domain/service/transport), RBAC, error handling, logging, pagination, testing checklist
- `convision-api-golang/DATABASE_GUIDE.md` — PostgreSQL types, indexes, soft-delete, migrations, multi-clinic isolation

### Current Authorization Code
- `convision-api-golang/internal/platform/auth/jwt.go` — Current JWT Claims struct and GenerateToken signature
- `convision-api-golang/internal/platform/auth/middleware.go` — Current RequireRole middleware (add new middlewares here)
- `convision-api-golang/internal/transport/http/v1/routes.go` — ALL route definitions with RequireRole calls (audited in PRD)
- `convision-api-golang/internal/domain/user.go` — Current User domain struct (rename `Role` → `RoleType`, add `Roles` relation)
- `convision-api-golang/internal/platform/storage/postgres/user_repository.go` — User repository (add role assignment methods)
- `convision-api-golang/internal/auth/service.go` — Login flow (add permission loading)
- `convision-api-golang/cmd/api/main.go` — DI wiring (add role/permission repos + services)
- `convision-api-golang/internal/platform/storage/postgres/db.go` — AutoMigrate (add Role, Permission to list)

### Frontend Code
- `convision-front/src/contexts/AuthContext.tsx` — Current auth (add hasPermission, permissions state, role_type rename)
- `convision-front/src/App.tsx` — Route protection (refactor allowedRoles → permissions)
- `convision-front/src/lib/axios.ts` — API client (reads token, unchanged by this phase)
- `convision-front/src/pages/admin/users/UserEditPage.tsx` — User edit (add role assignment UI)
- `convision-front/src/components/ui/SearchableCombobox.tsx` — Dropdown component for role selection
- `convision-front/src/components/ui/EntityTable.tsx` — Table component for roles list

### PRD Reference
- `.planning/prd/19-rbac-roles-permissions.md` — Complete audit, schema, permission catalog, migration strategy
</canonical_refs>

<specifics>
## Specific Ideas

### Permission Key Format
Every permission follows `<module>:<action>`. The `Permission` domain struct has a `Key() string` method that returns `Module + ":" + Action`.

### JWT Backward Compatibility
During migration, the JWT Claims struct carries BOTH `role` (old, for backward compat) and `user_type` (new, for theming) plus `permissions` (new, for RBAC). Frontend reads `permissions` for access control and `role_type` for colors/labels.

### No Redis Dependency
Token invalidation uses a `token_version` counter on the `users` table — no external cache needed. One extra DB query on `users` by PK per authenticated request.

### System Roles Are Immutable
System roles (`is_system=true`) cannot be deleted. The API returns 403 if delete is attempted. UI disables delete button with "Sistema" badge.

### Migration Is Zero-Breaking
Backend migration is gradual: add new tables/columns/fields → add new middleware → migrate routes one group at a time → remove old code. Frontend migration adds new permission hooks while keeping old role-based helpers for transition.

### Complete Route Audit
The PRD contains a complete endpoint-to-role mapping (Section 1.2) and endpoint-to-permission mapping (Section 5.7) covering ALL routes in the application. No route is left behind.
</specifics>

<deferred>
## Deferred Ideas

- Role hierarchy / inheritance (flat model for v1)
- Time-based or conditional permissions
- IP-based or geo-based access restrictions
- Audit logging for permission changes (can be added to audit_logs later)
- Dynamic module registration (modules are predefined, not user-created)
</deferred>

---

*Phase: 19-rbac-roles-permissions*
*Context gathered: 2026-05-06 via PRD Express Path*
