---
phase: "10"
plan: "05"
subsystem: frontend
tags: [entity-table, receptionist, migration]
requires: [entity-table-ledger-defaults]
provides: [quotes-entity-table, discount-requests-entity-table, patients-entity-table, order-list-entity-table, cash-register-history-entity-table, daily-report-history-entity-table, sales-entity-table]
affects: [receptionist entity list pages, admin/Sales.tsx (shared with receptionist)]
tech-stack:
  added: []
  patterns: [entity-table-migration, extra-filters, tab-driven-filters]
key-files:
  modified:
    - convision-front/src/pages/receptionist/Quotes.tsx
    - convision-front/src/pages/receptionist/DiscountRequests.tsx
    - convision-front/src/pages/receptionist/Patients.tsx
    - convision-front/src/pages/receptionist/OrderList.tsx
    - convision-front/src/pages/receptionist/CashRegisterHistory.tsx (already migrated)
    - convision-front/src/pages/receptionist/DailyReportHistory.tsx (already migrated)
    - convision-front/src/pages/admin/Sales.tsx (shared with receptionist route)
key-decisions:
  - Plan referred to receptionist/Sales.tsx and receptionist/LabOrders.tsx — neither exists. Actual files are admin/Sales.tsx (shared for both admin and receptionist sales route) and receptionist/OrderList.tsx.
  - admin/Sales.tsx migrated here because it is the actual page rendered on the receptionist/sales route and was missed in plan 10-03.
  - SalesCatalog.tsx excluded — it is a product catalog wizard for creating new sales, not an entity list; EntityTable is not appropriate.
  - DiscountRequests.tsx tab-based filtering: Tabs visual component kept for status switching, single EntityTable uses tab state as extraFilters. TabsContent bodies removed (EntityTable renders outside tabs).
  - Patients.tsx uses custom search params (s_f, s_v, s_o for OR multi-field search; f_f, f_v for filter) built in the EntityTable fetcher closure.
  - admin/Sales.tsx: today stats cards preserved above EntityTable. fetchTodayStats/fetchPaymentMethods still called on mount via useEffect. fetchSales replaced by queryClient.invalidateQueries({ queryKey: ['sales'] }).
requirements-completed: []
duration: "~30 min"
completed: "2026-04-24"
---

# Phase 10 Plan 05: Receptionist entity lists Summary

Migrated all 7 receptionist entity list pages to EntityTable. Two were already migrated (CashRegisterHistory, DailyReportHistory). Four were migrated in this session: Quotes, DiscountRequests, Patients, and OrderList. Additionally, admin/Sales.tsx was migrated because it serves the receptionist/sales route and was missed in plan 10-03.

All pagination state, direct list useQuery calls, and custom Table/DataTable usages replaced with EntityTable. Zero new TypeScript errors introduced.
