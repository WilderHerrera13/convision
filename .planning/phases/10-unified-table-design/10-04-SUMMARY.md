---
phase: "10"
plan: "04"
subsystem: frontend
tags: [entity-table, admin, migration]
requires: [entity-table-ledger-defaults]
provides: [laboratory-orders-entity-table, daily-reports-entity-table, expenses-entity-table, payrolls-entity-table, service-orders-entity-table, discount-requests-admin-entity-table, cash-closes-entity-table]
affects: [admin entity list pages — operational and financial modules]
tech-stack:
  added: []
  patterns: [entity-table-migration, tab-driven-filters, extra-filters]
key-files:
  modified:
    - convision-front/src/pages/admin/LaboratoryOrders.tsx
    - convision-front/src/pages/admin/DailyReports.tsx
    - convision-front/src/pages/admin/Expenses.tsx
    - convision-front/src/pages/admin/Payrolls.tsx
    - convision-front/src/pages/admin/ServiceOrders.tsx
    - convision-front/src/pages/admin/DiscountRequests.tsx
    - convision-front/src/pages/admin/CashCloses.tsx
    - convision-front/src/pages/admin/CashClosesByAdvisor.tsx
key-decisions:
  - LaboratoryOrders, DailyReports, Expenses, Payrolls, CashCloses, CashClosesByAdvisor were migrated in an earlier worktree session and did not need re-migration.
  - ServiceOrders.tsx and DiscountRequests.tsx required gap closure in session 2.
  - DiscountRequests.tsx: Tabs component kept as visual navigation (no TabsContent); single EntityTable uses tab state as extraFilters; renderDiscountRequestsTable dead function removed.
  - ServiceOrders.tsx: Kept useQuery for stats cards; only the list useQuery was replaced with EntityTable.
requirements-completed: []
duration: "~30 min (split across two sessions)"
completed: "2026-04-24"
---

# Phase 10 Plan 04: Admin entity lists batch 3 Summary

Migrated eight admin entity list pages covering operational and financial modules to EntityTable. Six files (LaboratoryOrders, DailyReports, Expenses, Payrolls, CashCloses, CashClosesByAdvisor) were migrated in an earlier worktree session. ServiceOrders and admin/DiscountRequests required gap closure.

DiscountRequests.tsx was the most complex: used tab-driven filtering (Tabs kept visual-only, single EntityTable with tab as extraFilters) and had a dead renderDiscountRequestsTable function after the return statement that was removed. All eight files compile with zero TypeScript errors.
