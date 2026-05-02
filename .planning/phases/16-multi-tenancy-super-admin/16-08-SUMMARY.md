---
plan: 16-08
status: complete
completed: 2026-05-02
---

# 16-08 Summary — Fix revoked_tokens Schema Routing

## What was built

Added `TableName() string` override to `RevokedToken` domain struct returning `"platform.revoked_tokens"`. Created migration `000023_revoked_tokens_to_platform` that moves the table from `optica_main` to the `platform` schema via `ALTER TABLE optica_main.revoked_tokens SET SCHEMA platform`.

## Why this fixes the 401 blocker

Migration 000022 moved all `public` tables (including `revoked_tokens`) to `optica_main`. The `Authenticate` middleware calls `revokedRepo.IsRevoked(globalDB, jti)` using `globalDB` whose `search_path` is `public`. Without a `TableName()` override, GORM resolved the table as `public.revoked_tokens` → query failed → 401 on every protected API call. The fix pins the table to `platform` where `globalDB` can always reach it.

## Key files

### Modified
- `convision-api-golang/internal/domain/revoked_token.go` — added `TableName()` returning `"platform.revoked_tokens"`

### Created
- `convision-api-golang/db/migrations/platform/000023_revoked_tokens_to_platform.up.sql`
- `convision-api-golang/db/migrations/platform/000023_revoked_tokens_to_platform.down.sql`

## Verification

- `grep 'TableName' convision-api-golang/internal/domain/revoked_token.go` → `"platform.revoked_tokens"` ✓
- `make build` exits 0 ✓
- `make test` — all 5 test packages pass ✓

## Self-Check: PASSED
