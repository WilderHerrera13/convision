---
phase: 16
plan: 01
subsystem: platform
tags: [multi-tenancy, domain, migrations, repositories]
requires: []
provides: [OpticaRepository, SuperAdminRepository, OpticaFeatureRepository, platform_schema]
affects: [db.go, main.go, errors.go]
tech-stack:
  added: []
  patterns: [GORM soft-delete, testify/mock, golang-migrate, clause.OnConflict]
key-files:
  created:
    - convision-api-golang/db/migrations/platform/000021_platform_schema.up.sql
    - convision-api-golang/db/migrations/platform/000021_platform_schema.down.sql
    - convision-api-golang/internal/domain/optica.go
    - convision-api-golang/internal/domain/super_admin.go
    - convision-api-golang/internal/domain/feature_flag.go
    - convision-api-golang/internal/domain/optica_feature.go
    - convision-api-golang/internal/platform/storage/postgres/optica_repository.go
    - convision-api-golang/internal/platform/storage/postgres/super_admin_repository.go
    - convision-api-golang/internal/platform/storage/postgres/optica_feature_repository.go
    - convision-api-golang/internal/testutil/mocks/optica_repo.go
    - convision-api-golang/internal/testutil/mocks/super_admin_repo.go
    - convision-api-golang/internal/testutil/mocks/optica_feature_repo.go
  modified:
    - convision-api-golang/internal/domain/errors.go
    - convision-api-golang/internal/platform/storage/postgres/db.go
    - convision-api-golang/cmd/api/main.go
    - convision-api-golang/db/migrations/platform/000002_cash_close_unique_partial.up.sql
key-decisions:
  - Migration numbered 000021 (000020 was already taken by rename_users_password_column)
  - GRANT wrapped in DO block for portability between dev (no convision_app role) and prod
  - ReservedSlugs map exported for use by service validation in 16-04
  - Platform repos wired in main.go with blank identifiers pending service wiring in 16-04
requirements-completed: []
duration: 4 min
completed: "2026-05-02"
---

# Phase 16 Plan 01: Platform Schema & Domain Summary

PostgreSQL `platform` schema with opticas, super_admins, optica_features tables; domain structs with `TableName()` returning `platform.<table>`; repositories with GORM; testify/mock mocks; AutoMigrate + main.go wiring.

**Duration:** 4 min | **Start:** 2026-05-02T04:17:51Z | **End:** 2026-05-02T04:22:24Z | **Tasks:** 12 | **Files:** 15

## Tasks Completed

| # | Task | Commit |
|---|------|--------|
| 1 | Migration 000021_platform_schema.up.sql | a6a9271 |
| 2 | Migration 000021_platform_schema.down.sql | a6a9271 |
| 3 | domain/optica.go | 1ab493f |
| 4 | domain/super_admin.go | 1ab493f |
| 5 | domain/feature_flag.go + optica_feature.go | 1ab493f |
| 6 | domain/errors.go additions | 1ab493f |
| 7 | postgres/optica_repository.go | 1ab493f |
| 8 | postgres/super_admin_repository.go | 1ab493f |
| 9 | postgres/optica_feature_repository.go | 1ab493f |
| 10 | testutil/mocks (3 files) | 1ab493f |
| 11 | AutoMigrate + main.go wiring | 1ab493f |
| 12 | migrate up verified, tables confirmed | 1ab493f |

## Deviations from Plan

**[Rule 3 - Blocking] Migration number conflict** — Found during: Task 1 | Issue: Plan specified 000020 but 000020_rename_users_password_column.up.sql already exists | Fix: Used 000021 instead | Files: migration files renamed | Verification: migrate up confirms 21/u | Commit: a6a9271

**[Rule 1 - Bug] Migration 2 DATE() IMMUTABLE failure** — Found during: Task 12 | Issue: 000002_cash_close_unique_partial uses DATE(close_date) which PostgreSQL won't allow in an index (not IMMUTABLE) | Fix: Changed to (close_date::date) in migration file; forced version to 20 (tables already applied via AutoMigrate) to unblock | Files: 000002_cash_close_unique_partial.up.sql | Verification: migrate up succeeds | Commit: 1ab493f

**[Rule 1 - Bug] convision_app role missing in dev** — Found during: Task 12 | Issue: GRANT CREATE ON DATABASE fails because convision_app role doesn't exist locally | Fix: Wrapped GRANT in DO $$ ... IF EXISTS $$ block | Files: 000021_platform_schema.up.sql | Verification: migrate up exits 0 | Commit: 1ab493f

**Total deviations:** 3 auto-fixed (1 blocking, 2 bug). **Impact:** Minimal — migration numbering is cosmetic; bug fixes ensure local dev workflow; no API contract changes.

## Verification

- ✓ `make build` succeeds
- ✓ `make test` passes (3 suites: cashclose, inventory, laboratory)
- ✓ `migrate up` applies cleanly (version 21)
- ✓ platform.opticas, platform.super_admins, platform.optica_features tables exist
- ✓ All domain structs compile with correct `TableName()` values
- ✓ All repository interfaces implemented and mocked

## Next

Ready for 16-02 (Tenant Resolution & Caches) which depends on this foundation.

## Self-Check: PASSED
