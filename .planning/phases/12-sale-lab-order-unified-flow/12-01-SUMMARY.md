---
plan: 12-01
status: complete
completed: 2026-04-24
---

# Summary: Plan 12-01 — Backend Domain & DB

## What was built

Extended `domain.SaleItem` with four new generic-product fields (`ProductID`, `ProductType`, `Name`, `Description`), added `GetBySaleID` and `GetFirstActive` to the laboratory repository interfaces and their PostgreSQL implementations, added a `Sale` association to `LaboratoryOrder`, and wired `billed_at` persistence into the appointment repository update. A SQL migration file was created for the new `sale_items` columns.

## key-files

### created
- `convision-api-golang/db/migrations/platform/000005_sale_item_generic_products.up.sql`
- `convision-api-golang/db/migrations/platform/000005_sale_item_generic_products.down.sql`

### modified
- `convision-api-golang/internal/domain/sale.go` — `SaleItem` extended with `ProductID`, `ProductType`, `Name`, `Description`
- `convision-api-golang/internal/domain/laboratory.go` — `LaboratoryRepository` + `GetFirstActive`, `LaboratoryOrderRepository` + `GetBySaleID`, `LaboratoryOrder` + `Sale` association
- `convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go` — implemented `GetFirstActive`, `GetBySaleID`, added `Preload("Sale")`
- `convision-api-golang/internal/platform/storage/postgres/appointment_repository.go` — added `"billed_at": a.BilledAt` to `Update()` map
- `convision-api-golang/internal/sale/service.go` — `ItemInput` extended with `ProductID`, `ProductType`, `Description`; `Create()` maps new fields

## Tasks completed

- ✓ Task 01-SQL — Create SQL migration for `sale_items` generic product columns
- ✓ Task 01-A — Extend `domain.SaleItem` with generic product fields
- ✓ Task 01-B — Add `GetBySaleID` to `domain.LaboratoryOrderRepository` interface
- ✓ Task 01-C — Add `GetFirstActive` to `domain.LaboratoryRepository` interface
- ✓ Task 01-B-Rel — Add `Sale` relation to `domain.LaboratoryOrder` and preload in `withRelations()`
- ✓ Task 01-D — Implement `GetBySaleID` in `postgres.LaboratoryOrderRepository`
- ✓ Task 01-E — Implement `GetFirstActive` in `postgres.LaboratoryRepository`
- ✓ Task 01-F — Update `sale.ItemInput` DTO and `Create()` mapping
- ✓ Task 01-G — Verified GORM AutoMigrate covers `SaleItem` (already present at db.go:108)
- ✓ Task 01-Appt — Patch `appointment_repository.go` Update() to persist `billed_at`
- ✓ Task 01-H — Build check: `go build ./...` exits 0; `go test ./internal/laboratory/...` exits 0

## Deviations

None. All tasks implemented exactly as specified in the plan. The `createMigrationFiles` CLI tool was not used directly (requires DB connection) — migration files were created manually following the same naming convention and numbering scheme (000005).

## Self-Check

PASSED — `go build ./...` exits 0 with no errors. All acceptance criteria verified via grep checks.
