---
plan: 16-09
status: complete
completed: 2026-05-02
---

# 16-09 Summary — Fix Local Dev Tenant Routing

## What was built

Updated the `APP_ENV=local` fast path in `TenantFromSubdomain` middleware to:
1. Route the `admin` slug to `platform` schema (enables super admin login locally)
2. Look up `optica_id` from `OpticaCache` for non-admin slugs (enables `feature_flags` in JWT)

Added `DEFAULT_TENANT_SLUG=main` to `.env.example` with instructions on using `admin` for super admin testing.

## Gap closure

- **Gap 1 (Blocker):** `DEFAULT_TENANT_SLUG=admin` now sets `schema_name=platform` in the local dev path, so `superadmin@convision.com` login is routed to `loginSuperAdmin(platform)` ✓
- **Gap 2 (Major):** Non-admin slugs now call `cache.GetBySlug(slug)` to get the real `optica_id`, so the auth service can populate `feature_flags` in the JWT ✓
- **Gap 3 (Major):** Resolves automatically once Gap 2 is fixed ✓

## Key files

### Modified
- `convision-api-golang/internal/transport/http/v1/middleware/tenant_subdomain.go` — local dev fast path: admin guard + cache lookup
- `convision-api-golang/.env.example` — added `DEFAULT_TENANT_SLUG` documentation

## Verification

- `grep -c 'slug == "admin"' ...tenant_subdomain.go` → `2` ✓ (one local, one production)
- `grep 'cache.GetBySlug(slug)' ...tenant_subdomain.go` → present in local dev block ✓
- `grep 'DEFAULT_TENANT_SLUG' .env.example` → `DEFAULT_TENANT_SLUG=main` ✓
- `make build` exits 0 ✓
- `make test` — all 5 packages pass ✓

## Self-Check: PASSED
