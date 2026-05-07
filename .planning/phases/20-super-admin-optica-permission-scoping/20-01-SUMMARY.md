---
plan: 20-01
status: complete
completed: 2026-05-07
---

## What Was Built

The data layer for optica-level permission ceilings. A new `platform.optica_allowed_permissions` table allows super admins to restrict which permission keys each optica's users can hold. An empty set means no restriction (all permissions pass through by default). The implementation includes a SQL migration, a GORM domain struct with `TableName()` targeting the platform schema, a repository interface in `domain`, and a concrete implementation using the platform `*gorm.DB`.

## Key Files

### Created
- `convision-api-golang/db/migrations/platform/000036_create_optica_allowed_permissions.up.sql`
- `convision-api-golang/db/migrations/platform/000036_create_optica_allowed_permissions.down.sql`
- `convision-api-golang/internal/domain/optica_permission.go`
- `convision-api-golang/internal/platform/storage/postgres/optica_permission_repository.go`

### Modified
- `convision-api-golang/internal/platform/storage/postgres/db.go` — added `&domain.OpticaAllowedPermission{}` to platform AutoMigrate list
- `convision-api-golang/cmd/api/main.go` — instantiated `opticaPermRepo` after `opticaFeatureRepo` (blank-assigned until 20-02/20-03 wires it)

## Decisions Made

- `ReplaceAll` uses `Delete` + `CreateInBatches` inside a single GORM transaction, matching the plan spec exactly.
- `HasAny` uses `Count` (no `SELECT *`) for efficiency.
- The `_ = opticaPermRepo` blank assignment in `main.go` is intentional and documented — the variable will be passed to services in plans 20-02 and 20-03.
- No deviations from the plan were necessary.

## Self-Check

- [x] All tasks executed
- [x] Each task committed individually
- [x] SUMMARY.md created
