---
status: human_needed
phase: 16-multi-tenancy-super-admin
verified: 2026-05-02
---

# Phase 16 Verification — Multi-Tenancy & Super Admin

## Automated Checks

### Gap-Closure Plans (16-08, 16-09)

| Check | Result |
|-------|--------|
| `RevokedToken.TableName()` returns `"platform.revoked_tokens"` | ✓ PASS |
| Migration 000023 up.sql: `ALTER TABLE optica_main.revoked_tokens SET SCHEMA platform` | ✓ PASS |
| Migration 000023 down.sql exists | ✓ PASS |
| `slug == "admin"` guard present in local dev block | ✓ PASS |
| `cache.GetBySlug(slug)` called in local dev block | ✓ PASS |
| `DEFAULT_TENANT_SLUG=main` documented in `.env.example` | ✓ PASS |
| `make build` exits 0 | ✓ PASS |
| `make test` — 5 packages pass | ✓ PASS |

### Original Phase Plans (16-01 through 16-07)

All 7 original plans have SUMMARY.md files confirming completion (platform schema, middleware, auth, super admin API, repository refactor, frontend, infra).

## Human Verification Required

The gap fixes address local development routing issues. The following items require a running environment to verify end-to-end:

### 1. Run migration 000023 before testing

```bash
migrate -database "$DATABASE_URL" -path convision-api-golang/db/migrations/platform up
```

This must be run first — the 401 fix only takes effect after `revoked_tokens` is physically in the `platform` schema.

### 2. Super admin login (Gap 1)

Set `DEFAULT_TENANT_SLUG=admin` in `.env`, restart the API, then:

```bash
curl -X POST http://localhost:8001/api/v1/auth/super-admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@convision.com","password":"password"}'
```

Expected: 200 with JWT containing `role: "super_admin"` and `schema_name: "platform"`.

### 3. Protected API calls return 200 (Gap 4)

After migration runs, with `DEFAULT_TENANT_SLUG=main`:
```bash
TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@convision.com","password":"password"}' | jq -r .token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/patients
```

Expected: 200 (not 401).

### 4. feature_flags populated in JWT (Gap 2)

Regular tenant login response should include `feature_flags` array with values, not `[]`.

### 5. Admin nav feature gating (Gap 3)

After Gap 2 is resolved, admin nav items should be filtered based on feature flags.

## Must-Haves Status

| Must-Have | Status |
|-----------|--------|
| `RevokedToken` resolves to `platform.revoked_tokens` | ✓ Automated |
| Migration 000023 moves table to platform schema | ✓ Automated |
| `DEFAULT_TENANT_SLUG=admin` routes to platform in local dev | ✓ Automated |
| Super admin login works locally | ○ Human (requires running env + migration) |
| Protected API calls return 200 post-migration | ○ Human (requires running env + migration) |
| feature_flags populated in JWT | ○ Human (requires running env) |
