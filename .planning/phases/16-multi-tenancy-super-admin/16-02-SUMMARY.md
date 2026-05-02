---
phase: 16
plan: 02
subsystem: platform
tags: [multi-tenancy, caches, middleware, jwt, cors]
requires: [platform_schema, OpticaRepository]
provides: [OpticaCache, FeatureFlagCache, TenantFromSubdomainMiddleware, TenantSchemaMiddleware]
affects: [jwt.go, auth/service.go, routes.go, handler.go, main.go, cors]
tech-stack:
  added: []
  patterns: [sync.RWMutex, double-checked locking, transaction-per-request, SET LOCAL search_path]
key-files:
  created:
    - convision-api-golang/internal/platform/opticacache/cache.go
    - convision-api-golang/internal/platform/opticacache/cache_test.go
    - convision-api-golang/internal/platform/featurecache/cache.go
    - convision-api-golang/internal/platform/featurecache/cache_test.go
    - convision-api-golang/internal/transport/http/v1/middleware/tenant_subdomain.go
    - convision-api-golang/internal/transport/http/v1/middleware/tenant_schema.go
  modified:
    - convision-api-golang/internal/platform/auth/jwt.go
    - convision-api-golang/internal/auth/service.go
    - convision-api-golang/internal/transport/http/v1/handler.go
    - convision-api-golang/internal/transport/http/v1/routes.go
    - convision-api-golang/internal/testutil/gin.go
    - convision-api-golang/cmd/api/main.go
key-decisions:
  - GenerateToken gets new params (opticaID, schemaName, featureFlags); auth/service.go passes zeros pending 16-03
  - TenantSchema JWT cross-check is a no-op until 16-03 populates SchemaName in tokens
  - testutil/gin.go passes empty opticacache.New() and nil db for test router compatibility
  - featureCache stored with blank identifier pending 16-03 auth service wiring
requirements-completed: []
duration: 15 min
completed: "2026-05-02"
---

# Phase 16 Plan 02: Tenant Resolution & Caches Summary

OpticaCache (RWMutex, WarmUp at startup), FeatureFlagCache (5-min TTL, double-checked locking), TenantFromSubdomainMiddleware (Host/X-Forwarded-Host parsing, local dev fallback), TenantSchemaMiddleware (transaction-per-request + SET LOCAL search_path + JWT cross-check), extended JWT Claims with OpticaID/SchemaName/FeatureFlags, CORS wildcard for *.app.opticaconvision.com.

**Duration:** 15 min | **Tasks:** 11 | **Files:** 12

## Deviations from Plan

**[Rule 2 - Missing Critical] testutil/gin.go RegisterRoutes signature mismatch** — Found during: Task 8 | Issue: test helper called old RegisterRoutes(api) signature | Fix: Pass opticacache.New() and nil db | Files: testutil/gin.go | Verification: make test passes | Commit: bddc4e9

**Total deviations:** 1 auto-fixed. **Impact:** None — test helper now compatible with new signature.

## Verification

- ✓ `make build` succeeds
- ✓ All 5 test suites pass including opticacache and featurecache
- ✓ OpticaCache WarmUp wired at startup in main.go
- ✓ TenantFromSubdomain applied to v1 group; TenantSchema on protected group
- ✓ JWT Claims extended with 3 new fields
- ✓ CORS uses HasSuffix for wildcard subdomain support

## Next

Ready for 16-05 (Repository Refactor) then 16-03 (Auth Service Update).

## Self-Check: PASSED
