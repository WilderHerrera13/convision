---
plan: 20-03
status: complete
completed: 2026-05-07
---

## What Was Built

Two HTTP endpoints that allow a super admin to read and replace the allowed permission set for any optica. Both endpoints sit inside the existing super-admin middleware group protected by `RequirePermission("super_admin:access")`.

## Key Files

### Created
- `convision-api-golang/internal/transport/http/v1/handler_optica_permission.go` — `GetOpticaPermissions` (GET) and `UpdateOpticaPermissions` (PUT) handlers; `permissionKeyPattern` regex for `module:action` format validation; Spanish error messages on bad input

### Modified
- `convision-api-golang/internal/transport/http/v1/routes.go` — added `superAdmin.GET("/opticas/:id/permissions", h.GetOpticaPermissions)` and `superAdmin.PUT("/opticas/:id/permissions", h.UpdateOpticaPermissions)` inside the existing super-admin group

## Decisions Made

- Routes were added inside the existing super-admin group from 20-02 (protected by `RequirePermission("super_admin:access")`) — no additional `RequirePermission("opticas:manage")` layer was added because the group-level middleware already enforces super-admin access.
- `GetOpticaPermissions` normalizes a nil slice to `[]string{}` so the JSON response always returns an array, never `null`.
- `UpdateOpticaPermissions` reads back the DB state after `ReplaceAll` to return the canonical persisted list, keeping the response consistent with the GET endpoint.
- Empty `permission_keys: []` passes validation and calls `ReplaceAll` with an empty slice, clearing all restrictions.
- The `opticaPermRepo` field and Handler struct were already wired by 20-02 — no changes needed to `handler.go` or `main.go`.

## Self-Check

- [x] All tasks executed
- [x] Each task committed individually
- [x] `go build ./...` exits 0
- [x] `go vet ./...` exits 0
- [x] SUMMARY.md created
