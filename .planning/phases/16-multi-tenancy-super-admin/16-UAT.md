---
status: diagnosed
phase: 16-multi-tenancy-super-admin
source: 16-01-SUMMARY.md, 16-02-SUMMARY.md, 16-03-SUMMARY.md, 16-04-SUMMARY.md, 16-05-SUMMARY.md, 16-06-SUMMARY.md, 16-07-SUMMARY.md
started: 2026-05-02T12:40:00Z
updated: 2026-05-02T12:55:00Z
mode: autonomous
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Server boots without errors, health endpoint returns live data.
result: pass

### 2. Super Admin Login
expected: POST /api/v1/auth/login with superadmin@convision.com returns JWT with role:super_admin and schema_name:platform.
result: issue
reported: "TenantFromSubdomainMiddleware local dev path (APP_ENV=local) always returns optica_main regardless of X-Forwarded-Host or admin subdomain. The admin slug check (slug == 'admin' → platform) is dead code in local mode. superadmin@convision.com login returns 401 Credenciales incorrectas because the request goes to loginTenantUser(optica_main) instead of loginSuperAdmin(platform)."
severity: blocker

### 3. Super Admin UI Redirect
expected: Logging in as super_admin navigates to /super-admin/opticas with dark sidebar layout.
result: blocked
blocked_by: prior-phase
reason: "Depends on super admin login working (test 2 failed)"

### 4. Opticas List Page
expected: /super-admin/opticas shows EntityTable with opticas or proper empty state.
result: blocked
blocked_by: prior-phase
reason: "Depends on super admin login working (test 2 failed)"

### 5. Create Optica Form
expected: Form fields (name, slug, plan, admin credentials) validate correctly and submit creates optica.
result: blocked
blocked_by: prior-phase
reason: "Depends on super admin login working (test 2 failed)"

### 6. Optica Detail & Feature Flag Toggles
expected: Detail page shows 12 feature flag toggles; toggling one calls the API and updates UI.
result: blocked
blocked_by: prior-phase
reason: "Depends on super admin login working (test 2 failed)"

### 7. Tenant Login Returns Feature Flags
expected: Regular tenant login (admin@convision.com) response includes feature_flags array with values.
result: issue
reported: "Tenant login succeeds and returns 200 with a token, but feature_flags is always [] and optica_id is always 0. Root: TenantFromSubdomainMiddleware local dev path hardcodes optica_id=uint(0) and never looks up the optica from the cache, so the auth service cannot resolve the feature flags for the tenant."
severity: major

### 8. Admin Nav Feature Gating
expected: Admin nav items are filtered by feature flags; un-gated items always visible.
result: issue
reported: "Cannot test feature gating because feature_flags is always empty ([] in JWT) due to optica_id=0 in local dev middleware. All nav items will behave as if all features are enabled/disabled depending on the useFeature(key) fallback."
severity: major

### 9. JWT Schema Cross-Check
expected: JWT token from one tenant used against wrong subdomain returns 403.
result: blocked
blocked_by: prior-phase
reason: "All protected API calls fail with 401 (see test 10) before reaching the cross-check logic"

### 10. Existing Features Regression
expected: Core admin flows (patients list, appointments) still work after the 144-file repository refactor.
result: issue
reported: "ALL protected API calls return 401 token validation error after migration 000022 runs. Root: migration 000022 moved revoked_tokens table from public schema to optica_main, but Authenticate middleware calls revokedRepo.IsRevoked(globalDB, claims.ID) using globalDB which has no schema context (search_path=public). The query fails → 401. After login, the frontend tries dashboard/appointments/notifications, all fail 401, axios interceptor tries to refresh (also 401), then redirects back to login. The app is fully broken post-migration."
severity: blocker

## Summary

total: 10
passed: 1
issues: 4
pending: 0
skipped: 0
blocked: 5

## Gaps

- truth: "Super admin can log in via admin subdomain and receive JWT with role:super_admin"
  status: failed
  reason: "TenantFromSubdomainMiddleware local dev path (APP_ENV=local) always returns optica_main regardless of X-Forwarded-Host or admin subdomain. The admin slug check (slug == 'admin' → platform) is dead code in local mode."
  severity: blocker
  test: 2
  root_cause: "tenant_subdomain.go lines 20-29: APP_ENV=local fast path always runs `c.Set(schemaNameKey, 'optica_'+slug)` and returns before reaching the `if slug == 'admin'` guard at line 43. Fix: add `if slug == 'admin' { c.Set(schemaNameKey, 'platform') } else { c.Set(schemaNameKey, 'optica_'+slug) }` inside the local dev block."
  artifacts:
    - path: "convision-api-golang/internal/transport/http/v1/middleware/tenant_subdomain.go"
      issue: "Lines 20-29: local dev fast path always prefixes optica_, never routes to platform"
  missing:
    - "Add if slug == 'admin' guard in local dev fast path (lines 20-29)"
    - "Add DEFAULT_TENANT_SLUG=main to .env.example with comment about using 'admin' for super admin testing"
  debug_session: ""

- truth: "Tenant login response includes populated feature_flags array"
  status: failed
  reason: "Tenant login succeeds but feature_flags is always [] and optica_id is always 0. Same root cause as gap 1: local dev middleware hardcodes optica_id=uint(0), so auth service can't look up feature flags in the FeatureCache."
  severity: major
  test: 7
  root_cause: "tenant_subdomain.go line 27: c.Set(opticaIDKey, uint(0)) hardcoded in local dev path. Fix is the same middleware change as gap 1 — after fixing the slug routing, the optica_id also needs to come from the cache. For local dev, add a cache lookup: if optica, ok := cache.GetBySlug(slug); ok { c.Set(opticaIDKey, optica.ID) }."
  artifacts:
    - path: "convision-api-golang/internal/transport/http/v1/middleware/tenant_subdomain.go"
      issue: "Line 27: c.Set(opticaIDKey, uint(0)) hardcoded; FeatureCache never consulted in local dev"
  missing:
    - "Local dev path must look up optica_id from cache after slug resolution"
  debug_session: ""

- truth: "Admin nav items are filtered/shown based on tenant feature flags"
  status: failed
  reason: "Cannot verify feature gating because feature_flags is always [] in JWT due to optica_id=0. Will be fixed when gap 2 (feature_flags) is fixed."
  severity: major
  test: 8
  root_cause: "Same root cause as gap 2 (optica_id=0 → empty feature_flags → useFeature always returns false/default)."
  artifacts:
    - path: "convision-api-golang/internal/transport/http/v1/middleware/tenant_subdomain.go"
      issue: "Cascade of gap 2 — no optica_id means no feature flags in JWT"
  missing:
    - "Fix gap 2 first; re-test nav gating after feature_flags populated"
  debug_session: ""

- truth: "All existing protected API endpoints work correctly after repository refactor"
  status: failed
  reason: "ALL protected API calls return 401 token validation error post-migration 000022. Migration moved revoked_tokens from public to optica_main, but Authenticate middleware uses globalDB (search_path=public) to call revokedRepo.IsRevoked(). RevokedToken struct has no TableName() override, so GORM queries public.revoked_tokens which no longer exists."
  severity: blocker
  test: 10
  root_cause: "domain/revoked_token.go: missing TableName() returning 'platform.revoked_tokens'. Revoked token records are cross-tenant (a JTI is globally unique) and must live in the platform schema alongside opticas/super_admins so globalDB can reach them. Fix: (1) Add TableName() to RevokedToken struct; (2) Create migration 000023 to ALTER TABLE optica_main.revoked_tokens SET SCHEMA platform."
  artifacts:
    - path: "convision-api-golang/internal/domain/revoked_token.go"
      issue: "Missing TableName() override — GORM uses unqualified 'revoked_tokens' which resolves to public after migration"
    - path: "convision-api-golang/internal/platform/auth/middleware.go"
      issue: "Line 41: revokedRepo.IsRevoked(globalDB, claims.ID) — globalDB has no tenant schema context"
    - path: "convision-api-golang/db/migrations/platform/000022_data_migration_main_tenant.up.sql"
      issue: "Moved ALL public tables including revoked_tokens to optica_main without considering cross-tenant access"
  missing:
    - "Add `func (RevokedToken) TableName() string { return \"platform.revoked_tokens\" }` to domain/revoked_token.go"
    - "Create db/migrations/platform/000023_revoked_tokens_to_platform.up.sql: ALTER TABLE optica_main.revoked_tokens SET SCHEMA platform"
    - "Create db/migrations/platform/000023_revoked_tokens_to_platform.down.sql: ALTER TABLE platform.revoked_tokens SET SCHEMA optica_main"
  debug_session: ""
