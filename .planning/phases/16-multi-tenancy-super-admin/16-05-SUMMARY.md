---
phase: 16
plan: 05
subsystem: platform
tags: [multi-tenancy, repository-refactor, gorm, tenant-db]
requires: [16-02]
provides: [tenant-scoped-db-propagation]
affects: [domain interfaces, postgres implementations, services, handlers, mocks, bulkimport]
tech-stack:
  added: []
  patterns: [db-as-first-param, tenantDBFromCtx, struct-without-db-field]
key-files:
  modified:
    - convision-api-golang/internal/domain/ (all 20 domain files with Repository interfaces)
    - convision-api-golang/internal/platform/storage/postgres/ (all ~30 repository implementations)
    - convision-api-golang/internal/transport/http/v1/ (all handlers)
    - convision-api-golang/internal/testutil/mocks/ (all mock repos)
    - convision-api-golang/internal/bulkimport/ (Importer interface + 5 importers)
    - convision-api-golang/cmd/api/main.go
key-decisions:
  - auth.Service stores db *gorm.DB internally — Login/Me/Refresh handler signatures unchanged
  - sale.Service stores db *gorm.DB internally — complex cross-repo orchestration
  - bulkimport.Importer.ProcessRow adds db *gorm.DB to enable repo calls inside importers
  - Platform repos (OpticaRepository, SuperAdminRepository, OpticaFeatureRepository) NOT updated — operate on platform schema
  - LensRepository and DashboardRepository updated even though lens is orphaned — keeps impl consistent with interface
requirements-completed: []
duration: ~45 min
completed: "2026-05-02"
---

# Phase 16 Plan 05: Repository Refactor Summary

All 30+ repository interfaces and implementations refactored to accept `db *gorm.DB` as first parameter. Repository structs no longer hold a `db` field. Services propagate the tenant-scoped DB down from handlers, which extract it via `tenantDBFromCtx(c *gin.Context)`. This enables `TenantSchemaMiddleware` (16-02) to set `SET LOCAL search_path = <tenant>` per request — every repo call automatically runs in the correct tenant schema.

**Duration:** ~45 min | **Waves:** 6 | **Files changed:** 144

## Deviations from Plan

**[Auto-fixed] bulkimport.Importer cascade** — Found during: Wave 1 | Issue: `Importer.ProcessRow` called repo methods without `db` param | Fix: Added `db *gorm.DB` to `ProcessRow` signature and all 5 importer implementations | Files: `importer.go`, `importer_patients.go`, `importer_doctors.go`, `importer_scheduled_appointments.go`, `importer_lenses.go`

**[Auto-fixed] cashclose/inventory/laboratory service tests** — Found during: Wave 5-6 | Issue: mock assertions missing db argument | Fix: added `mock.Anything` as first arg in all affected mock calls

**Total deviations:** 2 auto-fixed. **Impact:** None — build and tests pass.

## Verification

- ✓ `make build` succeeds (clean)
- ✓ `make test` — all suites pass, 0 failures
- ✓ All domain Repository interfaces have `db *gorm.DB` as first param
- ✓ All postgres repo structs are empty (`type FooRepository struct{}`)
- ✓ All constructors take no db param (`func NewFooRepository() *FooRepository`)
- ✓ Platform repos (optica, super_admin, optica_feature) untouched
- ✓ Handlers call `tenantDBFromCtx(c)` and pass db to service calls
- ✓ bulkimport.Importer.ProcessRow signature updated end-to-end

## Next

Ready for 16-03 (Auth Service Update — populate OpticaID/SchemaName/FeatureFlags in JWT) and 16-04 (Super Admin API).

## Self-Check: PASSED
