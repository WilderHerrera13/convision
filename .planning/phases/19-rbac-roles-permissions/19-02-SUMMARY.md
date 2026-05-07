---
phase: "19"
plan: "19-02"
subsystem: backend
tags: [rbac, jwt, middleware, role-crud, permissions]
requires: [19-01]
provides: [jwt-permissions, require-permission-middleware, role-service, role-crud-api]
affects: [auth/service, platform/auth/jwt, platform/auth/middleware, domain/role, role/service, transport/http/v1]
tech-stack:
  added: []
  patterns: [permission-set-map, token-version-check, role-crud-handlers]
key-files:
  created:
    - convision-api-golang/internal/platform/storage/postgres/permission_repository.go
    - convision-api-golang/internal/platform/storage/postgres/role_repository.go
    - convision-api-golang/internal/role/service.go
    - convision-api-golang/internal/transport/http/v1/handler_role.go
  modified:
    - convision-api-golang/internal/platform/auth/jwt.go
    - convision-api-golang/internal/platform/auth/middleware.go
    - convision-api-golang/internal/domain/role.go
    - convision-api-golang/internal/auth/service.go
    - convision-api-golang/internal/transport/http/v1/handler.go
    - convision-api-golang/internal/transport/http/v1/routes.go
    - convision-api-golang/cmd/api/main.go
key-decisions:
  - token_version check placed in Authenticate middleware after revoked-token check — single SELECT on platform users table
  - RequirePermission uses O(1) map[string]struct{} lookup via buildPermissionSet helper
  - RoleRepository uses domain.RoleModel (not domain.Role) to avoid string type collision
  - roleService wired before authService in main.go (auth depends on role for permission loading)
requirements-completed: [RBAC-02, RBAC-03, RBAC-04, RBAC-05, RBAC-06]
duration: "18 min"
completed: "2026-05-07T06:30:00Z"
---

# Phase 19 Plan 02: Backend JWT + Middleware + Role CRUD Summary

Extended JWT claims with Permissions and TokenVersion, added token_version invalidation check to Authenticate middleware, created RequirePermission/RequireAnyPermission/RequireAllPermissions middlewares with O(1) lookup, built full RoleService with CRUD and user assignment, created role CRUD HTTP handlers, and wired everything into main.go.

**Duration:** ~18 min | **Build:** passes | **Files:** 11 | **Tasks:** 13

**Next:** Ready for Plan 19-03 (Frontend role management UI)

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 19-02-01 | Extend JWT Claims struct and GenerateToken signature | done |
| 19-02-02 | Add RequirePermission middlewares to middleware.go | done |
| 19-02-03 | Add token_version check to Authenticate middleware | done |
| 19-02-04 | Create permission_repository.go | done |
| 19-02-05 | Create role_repository.go | done |
| 19-02-06 | Create internal/role/service.go + RolePermission struct | done |
| 19-02-07 | Update auth service: roleService dep + permissions on login | done |
| 19-02-08 | Create handler_role.go | done |
| 19-02-09 | Register role routes in routes.go | done |
| 19-02-10 | Update handler.go: role field, UserResource, NewHandler, Login | done |
| 19-02-11 | Wire in cmd/api/main.go | done |
| 19-02-12 | make build exits 0 | done |
| 19-02-13 | Verify all GenerateToken callers updated | done |

## Deviations from Plan

**[Rule 1 - Minor] RoleRepository uses RoleModel** — Plan code samples used `domain.Role{}` but the struct is `domain.RoleModel` due to Plan 19-01's naming decision. All repository and service code uses `domain.RoleModel`. No functional impact.

**Total deviations:** 1 auto-fixed. **Impact:** None.

## Self-Check

- [x] Claims struct has Permissions []string and TokenVersion int
- [x] GenerateToken accepts permissions []string as 5th param
- [x] Authenticate checks token_version against DB
- [x] RequirePermission/RequireAnyPermission/RequireAllPermissions exist
- [x] permission_repository.go and role_repository.go created
- [x] internal/role/service.go created with all methods
- [x] auth/service.go loads permissions on loginTenantUser and Refresh
- [x] handler_role.go has all 9 handlers
- [x] routes.go registers role/permission/user-role routes behind RequirePermission
- [x] handler.go has role field, UserResource.RoleType+Permissions, Login sends permissions
- [x] main.go wires roleRepo, permissionRepo, roleService
- [x] `make build` exits 0

## Self-Check: PASSED
