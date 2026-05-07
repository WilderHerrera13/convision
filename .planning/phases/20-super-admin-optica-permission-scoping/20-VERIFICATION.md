---
phase: 20
status: human_needed
verified_at: 2026-05-07T00:00:00Z
must_haves_verified: 5/6
---

## Verification — Phase 20: super-admin-optica-permission-scoping

### Goal

Allow super admins to define a permission ceiling per optica. Regular clinic users can only hold permissions within the optica's allowed set. An empty ceiling means no restriction (all permissions pass through by default).

### Must-Haves Check

| ID | Requirement | Status | Evidence |
|----|------------|--------|----------|
| SCOPE-01 | DB migration + domain model + repository | ✓ | Migration `000036_create_optica_allowed_permissions.up.sql` exists with composite PK `(optica_id, permission_key)`, FK `REFERENCES platform.opticas(id) ON DELETE CASCADE`, and `idx_oap_optica_id` index. `domain.OpticaAllowedPermission` struct has `TableName() = "platform.optica_allowed_permissions"`. `OpticaPermissionRepository` interface has `ListByOpticaID`, `ReplaceAll`, `HasAny`. Repository implementation uses transaction with `Delete + CreateInBatches`, `HasAny` uses `Count`. Added to platform AutoMigrate in `db.go` line 179. |
| SCOPE-02 | Permission intersection in login/refresh | ✓ | `auth/service.go` has `opticaPermRepo domain.OpticaPermissionRepository` field. Both `loginTenantUser` (line 156) and `Refresh` (line 231) apply intersection block guarded by `schemaName != "platform" && s.opticaPermRepo != nil`, calling `HasAny` then `ListByOpticaID` before `GenerateToken`. Super admin login (`loginSuperAdmin`) is completely separate and unaffected. Zero rows → `HasAny` returns false → pass-through. |
| SCOPE-03 | Filtered permissions endpoint | ✓ | `GET /api/v1/permissions` maps to `ListAllPermissions` in `handler_role.go`. Handler fetches all permissions then applies optica ceiling filter when `claims.SchemaName != "platform" && h.opticaPermRepo != nil && HasAny(claims.OpticaID)`. `GET /api/v1/super-admin/permissions` maps to `ListAllPermissionsForSuperAdmin`, which uses a per-request `SET LOCAL search_path` transaction to query a reference tenant schema and returns unfiltered results. Both routes registered in `routes.go`. |
| SCOPE-04 | Super-admin CRUD endpoints | ✓ | `handler_optica_permission.go` implements `GetOpticaPermissions` (GET) and `UpdateOpticaPermissions` (PUT). Key format validation uses `permissionKeyPattern = regexp.MustCompile("^[a-z_]+:[a-z_]+$")`. Empty `permission_keys` passes validation and calls `ReplaceAll([], [])` to clear restrictions. Spanish error messages on bad input. Both routes registered inside the `superAdmin` group (protected by `RequirePermission("super_admin:access")`): `superAdmin.GET("/opticas/:id/permissions")` and `superAdmin.PUT("/opticas/:id/permissions")`. Handler struct has `opticaPermRepo` and `superAdminPermSchema` fields wired through `NewHandler`. |
| SCOPE-05 | Frontend permission matrix panel | ~ | `opticaPermissions.ts` service exists with all three functions. `OpticaPermissionsPanel.tsx` exists with Accordion per module, Checkbox per action, "Seleccionar todo"/"Limpiar" per module, empty `permission_keys` → all checked, save via `useMutation` with toast. "Permisos" tab added to `OpticaDetailPage.tsx`. **Critical bug (CR-001)**: `getAllPermissions` calls `ApiService.get<Permission[]>('/api/v1/super-admin/permissions')` but the backend returns `{"data": [...]}` (envelope). `ApiService.get` only unwraps the envelope for specific filter endpoints (`/brands`, `/materials`, etc.) — `/super-admin/permissions` is NOT in that list. The non-filter path returns `response.data` directly, so the component receives `{ data: Permission[] }` instead of `Permission[]`. This means `allPerms.map(...)` would operate on an object, `allPerms` would be the envelope (or empty array from fallback), and the permission matrix would render empty. The panel renders but shows no permissions. The "Seleccionar todo" buttons and save flow are otherwise correct in implementation. |
| SCOPE-06 | Tests + full build pass | ✓ | All three tests pass: `TestPermissionIntersection_WithRestrictions`, `TestPermissionIntersection_NoRestrictions`, `TestPermissionIntersection_SuperAdmin` (verified via `go test ./internal/auth/... -run TestPermissionIntersection -v`). `go build ./...` exits 0. Frontend `npm run build` was confirmed by 20-05 SUMMARY (chunk size warnings only, no errors). |

### Human Verification Required

1. **CR-001 (Critical) — Permission matrix always shows empty:** The `getAllPermissions()` service function calls `ApiService.get<Permission[]>('/api/v1/super-admin/permissions')` but the backend wraps the response as `{"data": [...]}`. The `ApiService.get` envelope-unwrapping logic only runs for specific hardcoded filter endpoints and does not cover `/super-admin/permissions`. A human tester should open the OpticaDetailPage "Permisos" tab and confirm whether the accordion renders permissions or shows an empty accordion. If empty, the fix is to either: (a) change `getAllPermissions` to use `ApiService.get<{ data: Permission[] }>('/api/v1/super-admin/permissions').then(r => r.data)`, or (b) change the backend `ListAllPermissionsForSuperAdmin` to return a plain array instead of `{"data": [...]}`.

2. **End-to-end login interception test:** Verify that after configuring a permission ceiling for an optica via the PUT endpoint, a clinic user's subsequent login JWT actually contains only the intersected permissions. This requires a live backend with a real DB.

3. **Token refresh with ceiling:** Verify that after a permission ceiling change, token refresh also yields the restricted set (not just login).

### Gaps Found

**CR-001 (frontend envelope mismatch):** `opticaPermissions.ts` `getAllPermissions` does not unwrap the `{"data": [...]}` envelope returned by `GET /api/v1/super-admin/permissions`. `ApiService.get` only auto-unwraps for specific hardcoded filter endpoint URLs. The permission matrix panel UI is fully implemented but will render empty because `allPerms` will be the envelope object (or an empty array if ApiService falls into fallback), not the permissions array. This is a bug that prevents SCOPE-05 from working correctly in the browser without a manual fix.

All other backend requirements (SCOPE-01 through SCOPE-04, SCOPE-06) are fully and correctly implemented.

### Assessment

Phase 20 is substantially complete: the entire backend stack (migration, domain model, repository, auth service intersection, filtered endpoints, super-admin CRUD endpoints) is correctly implemented and all automated tests pass with `go build` and the three permission intersection unit tests green. The frontend panel component logic is sound, but there is one confirmed bug where `getAllPermissions` does not unwrap the API response envelope, which would cause the permission matrix accordion to render empty in the browser. This bug is fixable with a one-line change and does not affect any backend or test correctness. Human verification of the frontend UI is required before this phase can be marked fully passed.
