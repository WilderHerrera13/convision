---
phase: 16
plan: 04
subsystem: backend-api
tags: [super-admin, multi-tenancy, schema-provisioning, feature-flags]
provides:
  - super-admin REST API under /api/v1/super-admin/
  - OpticaService with two-phase schema provisioning
  - FeatureService with cache invalidation
key-files:
  created:
    - convision-api-golang/internal/optica/service.go
    - convision-api-golang/internal/optica/feature_service.go
    - convision-api-golang/internal/transport/http/v1/handler_optica.go
    - convision-api-golang/internal/transport/http/v1/handler_feature.go
    - convision-api-golang/db/migrations/platform/embed.go
  modified:
    - convision-api-golang/internal/domain/optica.go
    - convision-api-golang/internal/transport/http/v1/handler.go
    - convision-api-golang/internal/transport/http/v1/routes.go
    - convision-api-golang/cmd/api/main.go
key-decisions:
  - Migrations embed package at db/migrations/platform/embed.go (not cmd/api/) — Go //go:embed disallows ../ paths
  - runMigrations filters only *.up.sql to avoid running down migrations during provisioning
  - ErrReservedSlug handled as 422 (not 409) since it's a validation error, not uniqueness conflict
duration: 5 min
completed: 2026-05-02
---

# Phase 16 Plan 04: Super Admin API Summary

OpticaService with two-phase schema provisioning (INSERT optica → CREATE SCHEMA → tx migrations+seed), FeatureService with cache invalidation, and 8 REST endpoints under `/api/v1/super-admin/` protected by `RoleSuperAdmin`.

**Duration:** ~5 min | **Start:** 2026-05-02T11:48:59Z | **End:** 2026-05-02T11:53:56Z  
**Tasks completed:** 8/8 | **Files created/modified:** 9

## Tasks Completed

| Task | Commit | Files |
|------|--------|-------|
| 1: IsReservedSlug + embed package | cd7baa6 | domain/optica.go, db/migrations/platform/embed.go |
| 2: OpticaService | 9c4d968 | internal/optica/service.go |
| 3: FeatureService | d085056 | internal/optica/feature_service.go |
| 4+5: Optica + Feature handlers | 014964e | handler_optica.go, handler_feature.go |
| 6+7+8: Handler wiring + routes + main | 211823c | handler.go, routes.go, main.go |

## What Was Built

- `internal/optica/service.go` — `OpticaService` with `Create` (two-phase: INSERT row → CREATE SCHEMA → transaction with migrations+seed), `List`, `GetByID`, `Update`. On failure: compensating rollback (DROP SCHEMA CASCADE + Delete optica row).
- `internal/optica/feature_service.go` — `FeatureService` with `List`, `BulkUpdate`, `Toggle` (each invalidates featurecache), `AllKeys`.
- `db/migrations/platform/embed.go` — `platformmigrations.FS` embeds all `*.sql` files for use in tenant schema provisioning. Embed lives here because Go prohibits `..` paths in `//go:embed`.
- `handler_optica.go` — `ListOpticas`, `CreateOptica` (ErrReservedSlug → 422, ErrConflict → 409), `GetOptica`, `UpdateOptica`.
- `handler_feature.go` — `ListOpticaFeatures`, `BulkUpdateOpticaFeatures`, `ToggleOpticaFeature`, `ListFeatureKeys`.
- `routes.go` — super-admin group outside `protected` (no TenantSchema middleware), auth via `RequireRole(RoleSuperAdmin)`.

## Deviations from Plan

**[Rule 3 - Blocking] Embed path location** — Found during Task 2: `cmd/api/main.go` cannot embed `../../db/migrations/platform/*.sql` because Go prohibits `..` in `//go:embed` paths. Fix: created dedicated `db/migrations/platform/embed.go` package (`platformmigrations.FS`) and imported it from `main.go`. Also passes the FS as a constructor parameter to `OpticaService`. Files modified: `db/migrations/platform/embed.go`, `cmd/api/main.go`, `internal/optica/service.go`.

**[Rule 1 - Bug] runMigrations filters .up.sql only** — Plan code ran ALL `.sql` files including `.down.sql`. Fixed to filter `strings.HasSuffix(e.Name(), ".up.sql")` to avoid running rollback scripts during provisioning.

**Total deviations:** 2 auto-fixed. **Impact:** correct — embed works and migrations are provisioned forward-only.

## Issues Encountered

Task 8 (curl smoke tests) requires a running server with the platform schema in place — this is a runtime test that depends on plan 16-07 (data migration) completing first. The code compiles and builds successfully (`make build`).

## Next

Ready for 16-06 (Frontend Super Admin UI) which depends on this API.
