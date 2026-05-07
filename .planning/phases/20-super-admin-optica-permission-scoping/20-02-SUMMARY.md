---
plan: 20-02
status: complete
completed: 2026-05-07
---

## What Was Built

Permission intersection logic wired into the auth login/refresh flow so JWT permissions reflect only what the optica allows. The `GET /api/v1/permissions` endpoint now filters returned permissions by the optica's allowed scope. A new `GET /api/v1/super-admin/permissions` endpoint returns the full unfiltered catalog for the permission matrix UI.

## Key Files

### Modified
- `convision-api-golang/internal/auth/service.go` — added `opticaPermRepo domain.OpticaPermissionRepository` field; updated `NewService` constructor; added intersection block in `loginTenantUser` and `Refresh` (before `GenerateToken`, guarded by `schemaName != "platform"` and `HasAny`)
- `convision-api-golang/internal/transport/http/v1/handler.go` — added `opticaPermRepo domain.OpticaPermissionRepository` and `superAdminPermSchema string` fields to Handler struct; updated `NewHandler` with both parameters
- `convision-api-golang/internal/transport/http/v1/handler_role.go` — modified `ListAllPermissions` to filter by optica scope; added `ListAllPermissionsForSuperAdmin` handler using per-request transaction with `SET LOCAL search_path` to reference tenant schema
- `convision-api-golang/internal/transport/http/v1/routes.go` — registered `superAdmin.GET("/permissions", h.ListAllPermissionsForSuperAdmin)`
- `convision-api-golang/cmd/api/main.go` — removed `_ = opticaPermRepo` placeholder; passed `opticaPermRepo` to auth service constructor; computed `superAdminPermSchema` from first active optica; passed both to `NewHandler`

## Decisions Made

- Intersection is guarded by `s.opticaPermRepo != nil` in addition to `schemaName != "platform"` for safety against nil injection.
- `ListAllPermissionsForSuperAdmin` uses a `db.Begin()` + `SET LOCAL search_path` transaction (same pattern as `TenantSchema` middleware) to safely scope the query to the reference tenant without polluting the connection pool.
- `superAdminPermSchema` is computed at startup from `opticaRepo.ListAllActive()`. If no opticas exist yet, the handler returns an empty list rather than erroring.
- The `filtered := perms[:0]` pattern reuses the existing slice's backing array — correct since the original slice is not used after reassignment.

## Self-Check

- [x] All tasks executed
- [x] Each task committed individually
- [x] `go build ./...` exits 0
- [x] SUMMARY.md created
