---
phase: "18"
plan: "18-02"
subsystem: backend
tags: [sale, inventory, stock-deduction, kardex]
requires: [18-01 — default_warehouse_id on branches]
provides: [deductStock on Create, revertStock on Cancel]
affects: [sale service, stock movement repo, inventory item repo, main.go]
tech-stack:
  added: []
  patterns: [best-effort stock deduction, Modelo A warehouse lookup, DB transaction per item]
key-files:
  created: []
  modified:
    - convision-api-golang/internal/domain/inventory.go
    - convision-api-golang/internal/platform/storage/postgres/stock_movement_repository.go
    - convision-api-golang/internal/testutil/mocks/inventory_repo.go
    - convision-api-golang/internal/sale/service.go
    - convision-api-golang/cmd/api/main.go
key-decisions:
  - Best-effort: stock deduction/reversion never blocks a sale — logs warnings on all failure paths
  - Modelo A: warehouse resolved via branch.DefaultWarehouseID, not per-item
  - Partial deduction when available < requested (logs warning, deducts available)
  - revertStock looks up original exit movement via FindBySaleAndProduct for idempotent reversal
  - Mock updated to satisfy interface (Rule 3 auto-fix)
requirements-completed:
  - SALE-STOCK-01
  - SALE-STOCK-02
  - SALE-STOCK-03
  - SALE-STOCK-04
duration: "4 min"
completed: "2026-05-07"
---

# Phase 18 Plan 02: Sale service wiring — deductStock, revertStock, main.go Summary

`SaleService` now deducts stock on `Create` and restores it on `Cancel` via best-effort helpers using Modelo A (branch.DefaultWarehouseID). Each deduction/reversal is wrapped in a DB transaction; failures log warnings without blocking the sale.

**Duration:** 4 min | **Tasks:** 6/6 | **Files:** 5 modified

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add FindBySaleAndProduct to interface + postgres impl | a0d8fce | domain/inventory.go, stock_movement_repo.go, mocks |
| 2-5 | Service struct + helpers + call sites | 8344ba2 | sale/service.go |
| 6 | Wire main.go | 20f4ace | cmd/api/main.go |

## Deviations from Plan

**[Rule 3 - Blocking] Mock missing FindBySaleAndProduct** — Found during: Task 1 | `MockStockMovementRepository` didn't implement new interface method causing build failure | Fixed by adding `FindBySaleAndProduct` to `internal/testutil/mocks/inventory_repo.go` | Build passes.

## Issues Encountered

None

## Next

Ready for Plan 18-03 — frontend branch edit form default warehouse selector.

## Self-Check: PASSED
