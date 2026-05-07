---
phase: "18"
plan: "18-01"
subsystem: backend
tags: [migration, branch, domain, warehouse]
requires: []
provides: [default_warehouse_id on branches]
affects: [branch domain, branch service, branch handler]
tech-stack:
  added: []
  patterns: [branchToResource helper, nullable FK migration]
key-files:
  created:
    - convision-api-golang/db/migrations/platform/000038_add_default_warehouse_to_branches.up.sql
    - convision-api-golang/db/migrations/platform/000038_add_default_warehouse_to_branches.down.sql
  modified:
    - convision-api-golang/internal/domain/branch.go
    - convision-api-golang/internal/branch/service.go
    - convision-api-golang/internal/transport/http/v1/handler_branch.go
key-decisions:
  - Used pointer (*uint) for DefaultWarehouseID so GORM stores NULL when nil
  - ON DELETE SET NULL preserves branches when warehouse is deleted
  - branchToResource helper replaces four inline struct literals for DRY serialization
requirements-completed:
  - SALE-STOCK-01
duration: "1 min"
completed: "2026-05-07"
---

# Phase 18 Plan 01: Migration 000038 + Branch domain/service/handler Summary

SQL migration 000038 adds nullable `default_warehouse_id` FK to `branches`, wired through domain struct, `UpdateInput`, `Service.Update`, and `BranchResource` via a shared `branchToResource` helper.

**Duration:** 1 min | **Tasks:** 4/4 | **Files:** 5 modified/created

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create migration 000038 up and down SQL files | c8376c9 | 000038 up/down |
| 2 | Add DefaultWarehouseID to domain.Branch struct | 2fc176c | domain/branch.go |
| 3 | Add DefaultWarehouseID to branch.UpdateInput and Service.Update | d6e998d | branch/service.go |
| 4 | Add DefaultWarehouseID to BranchResource + branchToResource helper | 4f1dcee | handler_branch.go |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next

Ready for Plan 18-02 — sale service stock deduction/reversion wiring.

## Self-Check: PASSED
