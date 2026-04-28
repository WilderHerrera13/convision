---
phase: 14-multi-branch-clinic-support
plan: 01
subsystem: database
tags: [postgresql, migration, branches, multi-tenant]

requires: []
provides:
  - branches table with CRUD columns and is_active flag
  - user_branches junction table with UNIQUE(user_id, branch_id) constraint
  - branch_id FK on all 9 inventory/clinical tables (renamed from clinic_id)
  - branch_id NOT NULL on 4 tables that never had it (appointments, sales, cash_register_closes, daily_activity_reports)
  - idempotent default branch seed (id=1, name='Principal')
affects: [14-02, 14-03, 14-04]

tech-stack:
  added: []
  patterns: [PostgreSQL idempotent migration using IF NOT EXISTS / DO $$ blocks]

key-files:
  created:
    - convision-api-golang/db/migrations/platform/000017_multi_branch_support.up.sql
    - convision-api-golang/db/migrations/platform/000017_multi_branch_support.down.sql
  modified: []

key-decisions:
  - "Clinic-level scoping renamed to branch-level across the entire schema (clinic_id → branch_id)"
  - "Default branch 'Principal' (id=1) seeded as fallback for all data without an explicit branch membership"
  - "All column renames and new columns use IF EXISTS/IF NOT EXISTS guards for idempotent execution"

patterns-established:
  - "Idempotent SQL migrations using DO $$ blocks with information_schema introspection"

requirements-completed: [BRANCH-01, BRANCH-02, BRANCH-03, BRANCH-06, BRANCH-07]

duration: 5 min
completed: 2026-04-28
---

# Phase 14 Plan 01: DB Migrations — Summary

**PostgreSQL migration creating branches/user_branches tables, renaming clinic_id→branch_id on 9 tables, and adding branch_id to 4 new tables — all with idempotent guards and full rollback support**

## Performance

- **Duration:** 5 min
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- `branches` table with id, name, address, city, phone, email, is_active, timestamps
- `user_branches` junction table with FK cascade and UNIQUE(user_id, branch_id)
- 9 inventory/clinical tables have clinic_id renamed to branch_id with proper FKs
- 4 tables (appointments, sales, cash_register_closes, daily_activity_reports) gain branch_id NOT NULL
- Full down migration reverses all changes cleanly

## Task Commits

1. **Task 1 + Task 2: Write 000017 up.sql and down.sql** - `5b538d7` (feat)

## Files Created
- `convision-api-golang/db/migrations/platform/000017_multi_branch_support.up.sql` — Multi-branch schema migration (up)
- `convision-api-golang/db/migrations/platform/000017_multi_branch_support.down.sql` — Rollback migration (down)

## Decisions Made
- Used `DO $$` blocks with `information_schema.columns` introspection for idempotent column renames
- Default branch seeded at id=1 with `ON CONFLICT (id) DO NOTHING` to survive repeated migration runs
- All new columns use `ADD COLUMN IF NOT EXISTS` + `ALTER COLUMN SET NOT NULL` pattern (two-step for NULL safety)

## Deviations from Plan
None — plan executed exactly as written using the verbatim SQL content provided.

## Issues Encountered
None

## User Setup Required
None — migration must be applied to the dev database via golang-migrate.

## Next Phase Readiness
DB schema ready for 14-02 (Go domain models + branch repository) and 14-03 (branch middleware + auth enrichment).
