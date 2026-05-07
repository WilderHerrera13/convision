---
phase: "19"
plan: "19-01"
subsystem: backend
tags: [rbac, migrations, domain, postgresql]
requires: []
provides: [rbac-tables, rbac-domain-models, rbac-migrations]
affects: [domain/user, domain/role, user_repository, auth/service, user/service]
tech-stack:
  added: []
  patterns: [migration-versioned, gorm-many2many, domain-repository-interface]
key-files:
  created:
    - convision-api-golang/db/migrations/platform/000029_rename_users_role_to_role_type.up.sql
    - convision-api-golang/db/migrations/platform/000029_rename_users_role_to_role_type.down.sql
    - convision-api-golang/db/migrations/platform/000030_create_roles_table.up.sql
    - convision-api-golang/db/migrations/platform/000030_create_roles_table.down.sql
    - convision-api-golang/db/migrations/platform/000031_create_permissions_table.up.sql
    - convision-api-golang/db/migrations/platform/000031_create_permissions_table.down.sql
    - convision-api-golang/db/migrations/platform/000032_create_role_permissions_table.up.sql
    - convision-api-golang/db/migrations/platform/000032_create_role_permissions_table.down.sql
    - convision-api-golang/db/migrations/platform/000033_create_user_roles_table.up.sql
    - convision-api-golang/db/migrations/platform/000033_create_user_roles_table.down.sql
    - convision-api-golang/db/migrations/platform/000034_add_token_version_to_users.up.sql
    - convision-api-golang/db/migrations/platform/000034_add_token_version_to_users.down.sql
    - convision-api-golang/db/migrations/platform/000035_seed_rbac_data.up.sql
    - convision-api-golang/db/migrations/platform/000035_seed_rbac_data.down.sql
    - convision-api-golang/internal/domain/role.go
  modified:
    - convision-api-golang/internal/domain/user.go
    - convision-api-golang/internal/platform/storage/postgres/db.go
    - convision-api-golang/internal/platform/storage/postgres/user_repository.go
    - convision-api-golang/internal/auth/service.go
    - convision-api-golang/internal/user/service.go
    - convision-api-golang/internal/platform/auth/jwt.go
    - convision-api-golang/internal/transport/http/v1/handler.go
    - convision-api-golang/internal/bulkimport/importer_doctors.go
    - convision-api-golang/internal/bulkimport/importer_scheduled_appointments.go
    - convision-api-golang/internal/bulkimport/importer_staff_users.go
    - convision-api-golang/internal/platform/storage/postgres/dev_users.go
key-decisions:
  - Migration numbers shifted: planned 000028-000034 → actual 000029-000035 because 000028 was already taken by add_updated_to_bulk_import_logs
  - RoleModel struct named RoleModel (not Role) to avoid collision with existing domain.Role string type
  - UserRole join table added to role.go for GORM many2many support
requirements-completed: [RBAC-01, RBAC-02]
duration: "7 min"
completed: "2026-05-07T05:35:58Z"
---

# Phase 19 Plan 01: DB Migration + Seed Summary

7 SQL migration pairs (000029–000035) plus domain model updates establishing all RBAC tables — renames `users.role` to `users.role_type`, creates `roles`, `permissions`, `role_permissions`, `user_roles`, adds `token_version`, seeds 85+ permissions and 4 system roles, maps existing users to system roles.

**Duration:** 7 min | **Start:** 2026-05-07T05:28:55Z | **End:** 2026-05-07T05:35:58Z | **Tasks:** 12 | **Files:** 25

**Next:** Ready for Plan 19-02 (Backend JWT + middleware + Role CRUD)

## Tasks Completed

| # | Task | Commit |
|---|------|--------|
| 1 | Create migration 000029 rename role→role_type | da3fd66 |
| 2 | Create migration 000030 create roles table | 317074b |
| 3 | Create migration 000031 create permissions table (85+ seeds) | 4d37558 |
| 4 | Create migration 000032 create role_permissions join table | 063dfe1 |
| 5 | Create migration 000033 create user_roles join table | 063dfe1 |
| 6 | Create migration 000034 add token_version to users | ae5e644 |
| 7 | Create migration 000035 seed RBAC system roles + user mappings | 9c9d151 |
| 8 | Create domain/role.go | 3ebc353 |
| 9 | Update domain/user.go (rename Role→RoleType, add TokenVersion, Roles, extend interface) | 67ecdcb |
| 10 | Update user_repository.go (role_type, new methods) | 56e3ab6 |
| 11 | Update db.go AutoMigrate (RoleModel, Permission, UserRole) | 61c21a6 |
| 12 | Fix compilation errors + make build passes | a38a431 |

## Deviations from Plan

**[Rule 3 - Blocking] Migration number conflict** — Found during: Task 1 | Issue: `000028_add_updated_to_bulk_import_logs` already existed, blocking the planned 000028 migration | Fix: Renumbered all RBAC migrations to 000029–000035 | Verification: `ls db/migrations/platform/` shows no conflicts | Impact: No functional impact, migration logic unchanged.

**[Rule 1 - Bug] RoleModel struct name** — Found during: Task 8 | Issue: domain package already has `type Role string` constant; naming the new struct `Role` would conflict | Fix: Named `RoleModel` with explicit `TableName() = "roles"` | Impact: All references use `domain.RoleModel` instead of `domain.Role`.

**[Rule 1 - Bug] Multiple files referencing u.Role after rename** — Found during: Task 12 | Issue: 10 files across auth, bulkimport, transport layers still used `u.Role` | Fix: Updated all references to `u.RoleType` | Commits: a38a431 | Files affected: jwt.go, auth/service.go, user/service.go, handler.go, handler_cash_register_close.go, handler_specialist_report.go, 3 bulkimport importers, dev_users.go.

**Total deviations:** 3 auto-fixed. **Impact:** Build passes cleanly, no functional regression.

## Self-Check

- [x] Migration files 000029–000035 exist on disk
- [x] domain/role.go created with RoleModel, Permission, UserRole, interfaces
- [x] domain/user.go has RoleType, TokenVersion, Roles fields + extended interface
- [x] user_repository.go has role_type in columns + GetRoles/AssignRoles/IncrementTokenVersion
- [x] db.go has RoleModel, Permission, UserRole in both AutoMigrate calls (2 matches each)
- [x] `make build` exits 0

## Self-Check: PASSED
