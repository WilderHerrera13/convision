---
phase: "10"
plan: "03"
subsystem: frontend
tags: [entity-table, admin, migration]
requires: [entity-table-ledger-defaults]
provides: [patients-admin-entity-table, quotes-admin-entity-table, sales-admin-entity-table, purchases-admin-entity-table]
affects: [admin entity list pages]
tech-stack:
  added: []
  patterns: [entity-table-migration, extra-filters, custom-search-params]
key-files:
  modified:
    - convision-front/src/pages/admin/Patients.tsx
    - convision-front/src/pages/admin/Quotes.tsx
    - convision-front/src/pages/admin/Sales.tsx
    - convision-front/src/pages/admin/Purchases.tsx
key-decisions:
  - Purchases.tsx was already migrated in an earlier worktree session and did not need re-migration.
  - admin/Sales.tsx is also used via receptionist/sales route (see App.tsx line 617) — migrated here covers both roles.
  - Patients.tsx uses custom search params (s_f, s_v, s_o for multi-field OR search; f_f, f_v for status filter) to work with the backend's flexible query API.
  - Patients.tsx migration was gap-closed in session 2 after the worktree containing the first migration was deleted.
  - Removed: getPaginationPages helper, page/search/perPage state, list useQuery, handleSearch, clearSearch; replaced with EntityTable fetcher pattern.
requirements-completed: []
duration: "~45 min (split across two sessions)"
completed: "2026-04-24"
---

# Phase 10 Plan 03: Admin entity lists batch 2 Summary

Migrated four complex admin entity list pages to EntityTable. Purchases.tsx was already migrated in a prior worktree. Admin/Sales.tsx, admin/Quotes.tsx, and admin/Patients.tsx were migrated with full removal of direct useQuery list calls, manual pagination state, and custom search bars. All four files compile with zero TypeScript errors.

Patients.tsx uses a custom EntityTable fetcher with multi-field OR search params (s_f/s_v/s_o) and filter params (f_f/f_v) because the backend exposes a flexible query interface rather than a single `search` param.
