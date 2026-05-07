---
phase: 20
status: issues_found
depth: standard
files_reviewed: 15
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
reviewed_at: 2026-05-07T13:30:07Z
---

## Code Review — Phase 20: super-admin-optica-permission-scoping

### Summary

The core permission-ceiling feature is architecturally sound: the intersection logic is correct, the super-admin bypass works, and the empty-set pass-through behaviour is properly documented and tested. However, one critical bug exists — the `getAllPermissions` service call in the frontend does not unwrap the `{data: [...]}` envelope that the backend returns, so the permission matrix panel will always render empty on first load. Three medium-severity issues also need attention: two instances of slice-aliasing that mutate the caller's backing array, a TOCTOU window between `HasAny` and `ListByOpticaID` during login/refresh, and silent error swallowing in the permission ceiling path that can silently grant users more permissions than intended on a DB error.

---

### Findings

#### CR-001 — `getAllPermissions` returns `{data: [...]}` but service expects `Permission[]` [CRITICAL]

**File:** `convision-front/src/services/opticaPermissions.ts:17-18`

**Issue:** `ListAllPermissionsForSuperAdmin` (backend) responds with `c.JSON(200, gin.H{"data": perms})`. The `opticaPermissionsService.getAllPermissions` function calls `ApiService.get<Permission[]>('/api/v1/super-admin/permissions')`, which returns the raw axios `response.data`. Because `/api/v1/super-admin/permissions` is not listed in the `isFilterEndpoint` whitelist inside `ApiService`, no envelope-unwrapping occurs. The result passed to `OpticaPermissionsPanel` is `{data: [...]}` where an array is expected, so `allPerms.map(p => ...)` will iterate over the object's properties instead of permission objects — `allPerms` will always be `[]` (the default) because the type assertion silently fails.

**Impact:** The permissions matrix is always empty for the super admin user. No permissions can be assigned or revoked through the UI.

**Fix:** Either (a) unwrap in the service: `ApiService.get<{ data: Permission[] }>(...).then(r => r.data)`, or (b) change the backend handler to return the array directly without a `data` envelope (consistent with how `getOpticaPermissions` already returns `{permission_keys: [...]}` which the component handles via `opticaPerms.permission_keys`). Option (a) is the safer change-surface.

---

#### CR-002 — Slice aliasing via `permissions[:0]` mutates the original slice backing array [WARNING]

**File:** `convision-api-golang/internal/auth/service.go:163` and `:238`

**Issue:** Both `loginTenantUser` and `Refresh` filter permissions using `filtered := permissions[:0]`, then `append` into `filtered`. This re-uses the same underlying array as `permissions`. While Go's `append` behaviour means the filtered elements overwrite the first N slots of the original slice (which is safe here because `filtered` only reads each element before potentially overwriting a prior slot), this is a maintenance hazard: if `permissions` is ever used after the filter loop in either branch (e.g., logged, passed to another call), it will silently see a partially-corrupted view. The same pattern appears in `handler_role.go:118`.

**Impact:** No current data corruption (the original `permissions` variable is not read after the filter), but the pattern is fragile and violates least-surprise. A future code change that logs or re-uses `permissions` after the filter will introduce a subtle bug.

**Fix:** Replace `filtered := permissions[:0]` with `filtered := make([]string, 0, len(permissions))` in all three locations. For the handler (`handler_role.go`), use `filtered := make([]domain.Permission, 0, len(perms))` (or the correct type).

---

#### CR-003 — TOCTOU window between `HasAny` and `ListByOpticaID` in login/refresh [WARNING]

**File:** `convision-api-golang/internal/auth/service.go:157-158` and `:232-233`

**Issue:** The permission ceiling is applied via two sequential calls: `HasAny(opticaID)` then `ListByOpticaID(opticaID)`. Between these two calls, a concurrent `ReplaceAll` by another super admin could add or remove rows. If rows are removed between `HasAny` (returning `true`) and `ListByOpticaID` (now returning empty), `allowedSet` will be empty and `filtered` will become an empty slice — the user token will receive zero permissions. The reverse race (rows added between the calls) is harmless.

**Impact:** Low probability in practice (super admins rarely modify permissions concurrently with user logins), but the failure mode — a user receiving zero permissions — is severe for that login attempt and creates a confusing support incident.

**Fix:** Eliminate the `HasAny` call entirely. Call `ListByOpticaID` directly; if the returned slice is empty, the ceiling is not applied. This collapses two round-trips into one and removes the race:
```go
allowedKeys, err := s.opticaPermRepo.ListByOpticaID(ctx.OpticaID)
if err == nil && len(allowedKeys) > 0 {
    // apply ceiling
}
```

---

#### CR-004 — Silent error swallowing in permission ceiling may grant unrestricted permissions on DB error [WARNING]

**File:** `convision-api-golang/internal/auth/service.go:157` and `:232`

**Issue:** The condition `if hasRestriction, err := s.opticaPermRepo.HasAny(opticaID); err == nil && hasRestriction` silently ignores DB errors by treating any error as "no restriction". Similarly, `allowedKeys, _ := s.opticaPermRepo.ListByOpticaID(opticaID)` discards the error. If the platform DB is temporarily unavailable during login, the permission ceiling is silently skipped and the user receives their full, unrestricted permission set.

**Impact:** A DB outage or misconfiguration affecting only `platform.optica_allowed_permissions` would bypass a security control. The user receives more permissions than the super admin intended. The error is also unlogged, making diagnosis difficult.

**Fix:** On `HasAny` error, return an error from `loginTenantUser`/`Refresh` (fail-closed). On `ListByOpticaID` error after a successful `HasAny`, log and also fail-closed (return error). At minimum, log the errors:
```go
if hasRestriction, err := s.opticaPermRepo.HasAny(ctx.OpticaID); err != nil {
    s.logger.Error("failed to check optica permission restrictions", zap.Error(err))
    return nil, errors.New("internal error")
} else if hasRestriction {
    allowedKeys, err := s.opticaPermRepo.ListByOpticaID(ctx.OpticaID)
    if err != nil {
        s.logger.Error("failed to load optica allowed permissions", zap.Error(err))
        return nil, errors.New("internal error")
    }
    // apply ceiling
}
```

---

#### CR-005 — `DROP INDEX` in `.down.sql` uses `platform.idx_oap_optica_id` — incorrect syntax [WARNING]

**File:** `convision-api-golang/db/migrations/platform/000036_create_optica_allowed_permissions.down.sql:1`

**Issue:** The down migration contains `DROP INDEX IF EXISTS platform.idx_oap_optica_id;`. In PostgreSQL, `DROP INDEX` does not accept a schema-qualified index name directly in the standard syntax — the index name is not schema-qualified in `pg_indexes`; the table's schema is. The correct form is `DROP INDEX IF EXISTS platform.idx_oap_optica_id` which PostgreSQL actually does support in later versions when the index is inside a named schema, but the syntax was inconsistently applied: the corresponding `.up.sql` creates the index as `CREATE INDEX IF NOT EXISTS idx_oap_optica_id ON platform.optica_allowed_permissions (optica_id)` with no explicit schema on the index name itself. The resulting index name in the catalog is `idx_oap_optica_id` in schema `platform`. The down migration reference `platform.idx_oap_optica_id` will succeed on PostgreSQL 12+ but is inconsistent with the creation and could fail on some older PG versions or tools.

**Impact:** The down migration may fail or be silently a no-op on older PG versions, making rollback of this migration unreliable.

**Fix:** Standardise to the unqualified form matching the creation: `DROP INDEX IF EXISTS idx_oap_optica_id;` with `SET search_path = platform;` prepended, or verify explicitly that `platform.idx_oap_optica_id` resolves correctly in your exact Postgres version and document it.

---

#### CR-006 — `superAdminPermSchema` is sourced from first active optica at startup and never refreshed [INFO]

**File:** `convision-api-golang/cmd/api/main.go:172-175`

**Issue:** `superAdminPermSchema` is set once at startup from `opticaRepo.ListAllActive()[0].SchemaName`. If no opticas exist at startup (fresh environment), the string is `""` and `ListAllPermissionsForSuperAdmin` returns an empty list indefinitely until restart. If the first optica is later deleted or deactivated, the handler still uses its schema for permission lookups.

**Impact:** On a fresh deployment with no opticas yet provisioned, super admins cannot see the permission catalog at all and cannot configure permissions for future opticas. This is a usability issue, not a security one.

**Fix:** Instead of caching at startup, query the first active optica schema lazily inside `ListAllPermissionsForSuperAdmin` (or accept a designated "canonical permissions" optica from config). Alternatively, document the startup ordering requirement (opticas must exist before API is started in production).

---

#### CR-007 — Test file `service_permission_scope_test.go` tests a local copy of the logic, not the service itself [INFO]

**File:** `convision-api-golang/internal/auth/service_permission_scope_test.go`

**Issue:** The test file re-implements `applyPermissionCeiling` as a local function that mirrors the production logic. The tests exercise this local function, not the actual `loginTenantUser` or `Refresh` paths. If the production implementation diverges (e.g., the error-swallowing bug in CR-004 is fixed), the tests will not catch a regression in the service.

**Impact:** Test coverage gap — the tests validate algorithm correctness in isolation but do not catch service-level integration bugs (wrong DB, wrong opticaID extracted from context, error paths).

**Fix:** Add integration-style unit tests that inject a `mockOpticaPermRepo` into an actual `auth.Service` and call `loginTenantUser` through a thin wrapper, verifying the final `Permissions` field in `LoginOutput`. The existing mock struct in the file is well-structured and ready for this.

---

### Clean Files

The following files had no findings:

- `convision-api-golang/db/migrations/platform/000036_create_optica_allowed_permissions.up.sql` — correct schema, primary key composite, partial index. No issues beyond the index-name consistency note in CR-005 (which affects the `.down.sql`).
- `convision-api-golang/internal/domain/optica_permission.go` — clean domain model, correct TableName override, interface is minimal and well-documented.
- `convision-api-golang/internal/platform/storage/postgres/optica_permission_repository.go` — uses parameterised queries throughout (no SQL injection), `ReplaceAll` is correctly transactional, `CreateInBatches` limit is reasonable.
- `convision-api-golang/internal/platform/storage/postgres/db.go` — `OpticaAllowedPermission` correctly added to `Migrate()` (platform schema only); absent from `MigrateTenantSchema()` as intended.
- `convision-api-golang/internal/transport/http/v1/handler_optica_permission.go` — permission key format validated with regex before write, `ParseUint` with `bitSize=64` prevents integer overflow on 32-bit IDs, error responses are clean. The slice aliasing (same pattern as CR-002) is present but bounded by the handler's immediate `c.JSON` response, so no caller mutation risk here.
- `convision-api-golang/internal/transport/http/v1/routes.go` — new super-admin permission endpoints are correctly placed behind `jwtauth.RequirePermission("super_admin:access")`.
- `convision-front/src/pages/super-admin/OpticaDetailPage.tsx` — tab-based rendering is clean, `opticaId` guard with `Number.isFinite` is correct, feature toggle error handling is present.
- `convision-front/src/pages/super-admin/OpticaPermissionsPanel.tsx` — all API calls go through `opticaPermissionsService`, mutation error handling is present, `handleSave` correctly sends empty array when all permissions are selected (semantically equivalent to "no ceiling").
- `convision-front/src/services/opticaPermissions.ts` — service is correctly isolated in its own module (no inline API calls in components), except for CR-001 (response unwrapping bug).
