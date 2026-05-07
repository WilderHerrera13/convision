# Phase 20: Super-Admin Optica Permission Scoping — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning
**Source:** User request — extend RBAC (Phase 19) to allow super admin to ceiling-restrict permissions per optica

<domain>
## Phase Boundary

The super admin can configure which RBAC permission modules each optica's admin is allowed to use. This introduces a **permission ceiling** at the tenant level:

- New table `platform.optica_allowed_permissions` stores per-optica allowed permission keys
- At login, JWT `permissions` = `intersection(user_role_permissions, optica_allowed_permissions)`
- If an optica has **no rows** in optica_allowed_permissions → **all permissions pass through** (backward-compatible default)
- Admin UI: `GET /api/v1/permissions` returns only permissions within the optica's allowed scope
- Admin cannot assign roles/permissions outside their optica's allowed set
- Super admin UI: per-optica permission matrix panel (accordion by module, checkboxes per action)
- Super admin endpoints: `GET/PUT /api/v1/super-admin/opticas/:id/permissions`

**Out of scope:** Time-based permission expiry, per-branch permission scoping, role-level overrides beyond what the optica ceiling allows, audit log for permission scope changes.
</domain>

<decisions>
## Implementation Decisions

### Database Schema (Locked)

- New table: `platform.optica_allowed_permissions`
  ```sql
  CREATE TABLE IF NOT EXISTS platform.optica_allowed_permissions (
    optica_id      INTEGER NOT NULL REFERENCES platform.opticas(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (optica_id, permission_key)
  );
  CREATE INDEX IF NOT EXISTS idx_oap_optica_id ON platform.optica_allowed_permissions (optica_id);
  ```
- No FK from `permission_key` to the tenant `permissions` table — tenant schemas are isolated; keys are validated by application logic at write time
- No `deleted_at` — this table is managed as a full-replace set (PUT replaces all rows for an optica)
- Migration number: 000036 (next after 000035 from Phase 19)

### Go Domain Model (Locked)

- New struct `OpticaAllowedPermission` in `internal/domain/optica_permission.go`:
  ```go
  type OpticaAllowedPermission struct {
    OpticaID      uint      `gorm:"primaryKey"`
    PermissionKey string    `gorm:"primaryKey;type:varchar(100)"`
    CreatedAt     time.Time `gorm:"type:timestamptz;not null;default:now()"`
  }
  func (OpticaAllowedPermission) TableName() string { return "platform.optica_allowed_permissions" }
  ```
- New repository interface `OpticaPermissionRepository` in the same file:
  ```go
  type OpticaPermissionRepository interface {
    ListByOpticaID(opticaID uint) ([]string, error)         // returns []permission_key
    ReplaceAll(opticaID uint, keys []string) error           // DELETE all then INSERT in tx
    HasAny(opticaID uint) (bool, error)                      // existence check for default pass-through
  }
  ```
- Implementation in `internal/platform/storage/postgres/optica_permission_repository.go`
- Platform-level DB (not tenant DB) — methods receive the platform `*gorm.DB`

### Permission Intersection Logic (Locked)

Location: `internal/auth/service.go` — `loginTenantUser` and `Refresh` methods

```go
// After loading rolePermissions []string:
allowedKeys, _ := opticaPermRepo.ListByOpticaID(opticaID)
hasRestriction, _ := opticaPermRepo.HasAny(opticaID)
if hasRestriction {
    allowedSet := make(map[string]struct{}, len(allowedKeys))
    for _, k := range allowedKeys { allowedSet[k] = struct{}{} }
    filtered := rolePermissions[:0]
    for _, p := range rolePermissions {
        if _, ok := allowedSet[p]; ok {
            filtered = append(filtered, p)
        }
    }
    rolePermissions = filtered
}
// JWT generated with (potentially) filtered rolePermissions
```

- Super admin users (`SchemaName == "platform"`) skip the intersection — they always get all permissions
- If `HasAny` returns false (no rows) → pass all role permissions through (default)

### Permissions List Endpoint Filtering (Locked)

`GET /api/v1/permissions` (existing endpoint in handler_role.go):
- Read `claims.OpticaID` from context
- If optica has restrictions (`HasAny == true`): return only permissions whose key is in `optica_allowed_permissions`
- If no restrictions: return all permissions (existing behavior unchanged)
- This ensures admin's role management UI only shows valid options for their optica

### Super Admin API Endpoints (Locked)

Both routes live under the super-admin sub-router, protected by `RequirePermission("opticas:manage")`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/super-admin/opticas/:id/permissions` | List allowed permission keys for optica |
| PUT | `/api/v1/super-admin/opticas/:id/permissions` | Replace allowed permission keys (body: `{"permission_keys": ["module:action", ...]}`) |

- PUT with empty array `[]` means "clear restrictions → allow all"
- Validation: each key must match format `^[a-z_]+:[a-z_]+$`
- Handler: `internal/transport/http/v1/handler_optica_permission.go`
- Routes registered in `routes.go` under existing super-admin group

### JWT Claims — No Struct Change (Locked)

`Claims.Permissions []string` already exists. The intersection logic runs BEFORE `GenerateToken` is called, so no JWT struct change is needed.

### Frontend — Super Admin Panel (Locked)

- File: `convision-front/src/pages/super-admin/OpticaPermissionsPanel.tsx`
- Rendered inside existing optica detail/edit page as a collapsible section
- Layout: Accordion per module (same modules as Phase 19 permission matrix), checkbox per action
- "Seleccionar todo" / "Deseleccionar todo" per module row
- On save: PUT to `/api/v1/super-admin/opticas/:id/permissions`
- Service calls: `getRolesPermissions()` (all permissions, for the matrix) and `getOpticaPermissions(id)` (current allowed set)
- If no permissions saved yet → all checkboxes checked (default = all allowed)
- Frontend service file: `convision-front/src/services/opticaPermissions.ts`

### Frontend — Admin Permission List Filtering (Locked)

- `GET /api/v1/permissions` already is the source for the role management UI (RolesManagementPage + RoleFormDialog from Phase 19)
- Since the backend now filters this endpoint per optica, no frontend change is needed — filtering is transparent
- The `UserType` field in Claims is used only for UI theming, no change needed

### Migration Strategy (Locked)

- Plan 20-01: DB — migration 000036, domain model, platform repo
- Plan 20-02: Backend — permission intersection in auth service, filtered permissions endpoint
- Plan 20-03: Super Admin API — handler_optica_permission.go + routes
- Plan 20-04: Frontend — OpticaPermissionsPanel in super admin UI + opticaPermissions.ts service
- Plan 20-05: Verification — integration test for intersection logic, make build/test/npm build

### the agent's Discretion

- Exact Zap logger field names for the intersection step
- Exact error message phrasing for 422 invalid permission key format (Spanish for API response bodies)
- Pagination behavior for `GET /super-admin/opticas/:id/permissions` (no pagination needed — max ~85 keys)
- CSS/layout specifics within OpticaPermissionsPanel (use project Tailwind tokens + shadcn Accordion)
- Whether OpticaPermissionsPanel is a separate route or embedded tab in existing optica edit page

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Conventions
- `CLAUDE.md` — Golden rules (English-only code, backend/frontend architecture)
- `convision-api-golang/DEVELOPMENT_GUIDE.md` — 3-layer architecture, RBAC, error handling, logging, pagination, testing
- `convision-api-golang/DATABASE_GUIDE.md` — PostgreSQL types, indexes, multi-clinic isolation, migrations

### Phase 16 — Multi-Tenancy Foundation
- `convision-api-golang/internal/domain/optica.go` — Optica struct and OpticaRepository
- `convision-api-golang/internal/domain/optica_feature.go` — OpticaFeature pattern (BulkUpsert, SeedDefaults) — reference for the new OpticaAllowedPermission repo
- `convision-api-golang/internal/platform/storage/postgres/optica_feature_repository.go` — ReplaceAll pattern reference
- `convision-api-golang/internal/platform/storage/postgres/db.go` — platform DB AutoMigrate (add OpticaAllowedPermission)
- `convision-api-golang/cmd/api/main.go` — DI wiring (add opticaPermRepo)

### Phase 19 — RBAC Foundation
- `convision-api-golang/internal/domain/role.go` — RoleModel, Permission, repository interfaces
- `convision-api-golang/internal/platform/auth/jwt.go` — Claims struct (Permissions []string already there)
- `convision-api-golang/internal/auth/service.go` — loginTenantUser and Refresh (modify here for intersection)
- `convision-api-golang/internal/transport/http/v1/handler_role.go` — ListPermissions handler (modify for filtering)
- `convision-api-golang/internal/transport/http/v1/routes.go` — route registration (add super-admin permission routes)
- `convision-api-golang/internal/transport/http/v1/handler.go` — Handler struct (add opticaPermRepo field)

### Frontend
- `convision-front/src/pages/super-admin/` — existing super admin pages (reference for layout/routing)
- `convision-front/src/services/roles.ts` — existing role API service (reference pattern for new service)
- `convision-front/src/pages/admin/RoleFormDialog.tsx` — permission matrix dialog (reference for accordion+checkbox pattern)
- `convision-front/src/App.tsx` — route registration

</canonical_refs>

<specifics>
## Specific Ideas

### Default Pass-Through
`HasAny(opticaID) == false` → zero rows → optica has no restrictions → ALL permissions pass through. This is the backward-compatible default for existing opticas. No migration needed for existing tenants.

### Super Admin is Exempt
When `claims.SchemaName == "platform"` (super admin login path), skip the intersection entirely. Super admin always retains full permission access regardless of optica settings.

### Intersection at JWT Generation, Not at Request Time
The intersection runs once at login/refresh (expensive but infrequent). Middleware `RequirePermission` does an O(1) map lookup against the JWT's pre-filtered `permissions` claim — no extra DB query per request.

### PUT Replaces Entire Set
`PUT /api/v1/super-admin/opticas/:id/permissions` with `permission_keys: []` clears all restrictions (allows everything). This is the "reset to default" action.

### Module-Level Grouping for UI
The permission matrix in `OpticaPermissionsPanel` uses the same module grouping as `RoleFormDialog` from Phase 19 — group by `Permission.Module`, show action checkboxes per row. The frontend fetches all available permissions from `GET /api/v1/super-admin/permissions` (a new super-admin endpoint that always returns all permissions, bypassing the optica filter).

### New Super Admin Permissions Endpoint
To populate the matrix in super admin UI, we need an unfiltered list. Add:
`GET /api/v1/super-admin/permissions` — returns all permissions from the `permissions` table of any single tenant (all tenants share the same 85 seeded permissions from migration 000031).
</specifics>

<deferred>
## Deferred Ideas

- Per-branch permission scoping (flat optica-level ceiling is sufficient for v1)
- Time-based permission windows (e.g., temporarily disable a module)
- Audit log for super-admin permission scope changes
- Bulk permission template (apply same scope to multiple opticas at once)
- Permission scope inheritance between optica plans (standard vs enterprise plan gates)
</deferred>

---

*Phase: 20-super-admin-optica-permission-scoping*
*Context gathered: 2026-05-07*
