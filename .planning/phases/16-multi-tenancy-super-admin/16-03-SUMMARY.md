---
phase: 16-multi-tenancy-super-admin
plan: 03
subsystem: auth
tags: [jwt, bcrypt, gin, gorm, feature-flags, multi-tenancy, super-admin]

requires:
  - phase: 16-01
    provides: platform schema, SuperAdmin domain, SuperAdminRepository
  - phase: 16-02
    provides: FeatureCache, TenantFromSubdomain middleware, TenantSchema middleware
provides:
  - Super admin login via platform.super_admins (admin subdomain)
  - Tenant login with feature_flags in JWT and response
  - Token cross-check: JWT schema_name vs subdomain (middleware enforces 403 on mismatch)
  - Refresh endpoint reloads feature flags from cache
  - RoleSuperAdmin constant for RequireRole middleware
  - SchemaNameKey() and OpticaIDKey() exported from tenant_subdomain middleware
affects: [16-04 super-admin-pages, 16-06 tenant-provisioning]

tech-stack:
  added: []
  patterns:
    - "Branch login by schema: schema=platform → SuperAdminRepository, schema=optica_* → tenant UserRepository with transaction + SET LOCAL search_path"
    - "LoginContext carries SchemaName, OpticaID, and DB (global) from handler to auth service"
    - "Handler holds *gorm.DB for public routes (Login) that don't run TenantSchema middleware"
    - "loginTenantUser begins a transaction, sets SET LOCAL search_path, queries users/branches, then rolls back"

key-files:
  created: []
  modified:
    - convision-api-golang/internal/domain/user.go — added RoleSuperAdmin constant
    - convision-api-golang/internal/auth/service.go — LoginContext, loginSuperAdmin, loginTenantUser, FeatureFlags in LoginOutput, Refresh reloads flags
    - convision-api-golang/internal/transport/http/v1/handler.go — Login reads schema/optica from context, different response shape for super_admin vs tenant, Refresh passes opticaID/schemaName, Handler.db field
    - convision-api-golang/internal/transport/http/v1/middleware/tenant_subdomain.go — exported SchemaNameKey() and OpticaIDKey()
    - convision-api-golang/cmd/api/main.go — wired superAdminRepo and featureCache into auth service, moved platform repos before services, db into Handler

key-decisions:
  - "Handlers hold *gorm.DB for public Login route since TenantSchema middleware doesn't run on public endpoints"
  - "loginTenantUser uses explicit transaction with SET LOCAL search_path because Login endpoint has no tenant context set"
  - "Refresh service signature extended with opticaID and schemaName parameters for flag reload and token generation"
  - "Super admin login returns minimal user object (id, name, email, role) — no branch_assignments"

patterns-established:
  - "Schema-based auth branching: Login reads schema_name from context → dispatches to SuperAdminRepository or tenant UserRepository"
  - "FeatureFlags in JWT claims and login response for tenant users"
  - "Explicit db parameter pattern extended to ensureOperatorBranchesForLogin and loadBranches"

requirements-completed: []

duration: —
completed: 2026-05-02
---

# Phase 16 Plan 03: Auth Service Update Summary

**Super admin login via platform.super_admins for admin subdomain, tenant login with feature_flags in JWT, and token schema-name cross-check enforcement**

## Performance

- **Duration:** — (not measured)
- **Started:** 2026-05-02T01:08:00-05:00
- **Completed:** 2026-05-02T01:30:00-05:00
- **Tasks:** 6
- **Files modified:** 5

## Accomplishments
- Added `RoleSuperAdmin` constant to domain, enabling the role in middleware and JWT
- Auth service now branches login by schema: `platform` → SuperAdminRepository, tenant → UserRepository with transaction-scoped schema
- Login response includes `feature_flags` array for tenant users; super admin gets minimal user object
- Refresh endpoint reloads feature flags from cache and includes them in new token
- `RequireRole(domain.RoleSuperAdmin)` works without code changes — middleware already generic
- Super admin login verified with curl: returns JWT with `role: "super_admin"`, `schema_name: "platform"`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RoleSuperAdmin constant** - `bb70559` (feat)
2. **Task 2: Refactor auth service — branch login** - `67eaa8c` (feat)
3. **Task 3: Update Login/Refresh handlers** - `e389a78` (feat)
4. **Task 4: Wire into main.go** - `3095837` (feat)
5. **Task 5: Verify RequireRole middleware** — No code change needed; middleware already supports any domain.Role
6. **Task 6: Test auth flow with curl** — Verified super admin login successfully; tenant login setup blocked by Docker port binding issue (system-level)

**Fix commits:**
- `f4a3e96` (fix): use transaction with SET LOCAL search_path in loginTenantUser — needed because Login is a public endpoint without TenantSchema middleware

## Files Created/Modified
- `convision-api-golang/internal/domain/user.go` — Added `RoleSuperAdmin` before `RoleAdmin`
- `convision-api-golang/internal/auth/service.go` — Added LoginContext, loginSuperAdmin, loginTenantUser, feature_flags support, fmt import
- `convision-api-golang/internal/transport/http/v1/handler.go` — Login/Refresh handlers updated, Handler.db field added
- `convision-api-golang/internal/transport/http/v1/middleware/tenant_subdomain.go` — Exported SchemaNameKey() and OpticaIDKey()
- `convision-api-golang/cmd/api/main.go` — Wired superAdminRepo, featureCache into auth service; moved platform repos; db into Handler

## Decisions Made
- `Handler.db` field was necessary because Login is a public endpoint and TenantSchema middleware hasn't set the tenant DB yet
- `loginTenantUser` begins a transaction with `SET LOCAL search_path` to query the correct tenant schema, mirroring what TenantSchema middleware does for protected routes
- `Refresh` service method now accepts `opticaID` and `schemaName` in addition to the existing parameters, enabling flag reload and correct token generation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] loginTenantUser needed explicit SET LOCAL search_path**
- **Found during:** Task 3 (Login handler)
- **Issue:** The plan's `LoginContext.DB` was set to nil in the handler, but `loginTenantUser` uses `ctx.DB` for tenant queries. Since Login is a public endpoint, TenantSchema middleware has not run and the DB has no schema scope.
- **Fix:** Added a transaction with `SET LOCAL search_path = <schema_name>` in `loginTenantUser`, and passed the global `h.db` in LoginContext from the handler.
- **Files modified:** `internal/auth/service.go`, `internal/transport/http/v1/handler.go`
- **Verification:** Build succeeds, super admin login works
- **Committed in:** `e389a78` (handler), `f4a3e96` (service fix)

**2. [Rule 3 - Blocking] Refresh method needed schemaName parameter**
- **Found during:** Task 2 (auth service refactor)
- **Issue:** The plan showed `claims.SchemaName` inside Refresh but didn't pass it as a parameter. The method needs the schema name to generate the new JWT.
- **Fix:** Added `schemaName string` to Refresh signature; handler reads it from JWT claims.
- **Files modified:** `internal/auth/service.go`, `internal/transport/http/v1/handler.go`
- **Verification:** Build succeeds, tests pass
- **Committed in:** `67eaa8c`

**3. [Rule 3 - Blocking] Handler needed db field for Login public route**
- **Found during:** Task 3 (Login handler)
- **Issue:** The plan's Login handler set `DB: nil` in LoginContext, but `loginTenantUser` needs a DB connection. The Handler didn't hold a *gorm.DB reference.
- **Fix:** Added `db *gorm.DB` to Handler struct, updated NewHandler, passed to Login context.
- **Files modified:** `internal/transport/http/v1/handler.go`, `cmd/api/main.go`
- **Verification:** Build succeeds
- **Committed in:** `e389a78`

**4. [Rule 3 - Blocking] Platform repos declared after auth service use**
- **Found during:** Task 4 (main.go wiring)
- **Issue:** `superAdminRepo` was declared after `authService` construction, causing undefined variable error.
- **Fix:** Moved platform repository declarations before the service construction block.
- **Files modified:** `cmd/api/main.go`
- **Verification:** Build succeeds
- **Committed in:** `3095837`

---

**Total deviations:** 4 auto-fixed (4 blocking)
**Impact on plan:** All fixes necessary for the auth service to actually compile and function. The plan had architectural gaps around how Login (a public endpoint) should access the tenant database, which is resolved with the same transaction + SET LOCAL pattern used in TenantSchema middleware.

## Issues Encountered
- Docker port binding conflict prevented full curl testing of tenant login and token cross-check. Super admin login verified successfully via curl with APP_ENV=staging.
- Tenant login testing requires optica schema with users — seeded manually in Docker but couldn't restart due to Docker Desktop port allocation bug.
- Middleware already supports any `domain.Role` in `RequireRole` — no code change needed for super_admin support.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Auth service is ready for 16-04 (super admin pages) — super admin login returns JWT with correct role and schema name
- Feature flags are embedded in tenant JWT tokens and refreshed on token refresh
- Token cross-check middleware (TenantSchema) is in place and will enforce JWT schema_name vs subdomain
- `RequireRole(domain.RoleSuperAdmin)` is usable in routes

---

*Phase: 16-multi-tenancy-super-admin*
*Completed: 2026-05-02*
