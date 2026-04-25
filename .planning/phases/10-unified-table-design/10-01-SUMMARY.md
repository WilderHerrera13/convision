---
phase: "10"
plan: "01"
subsystem: frontend
tags: [entity-table, data-table, ui-components]
requires: []
provides: [entity-table-ledger-defaults, data-table-sort-button-ledger, entity-table-barrel-exports]
affects: [all entity list pages using EntityTable]
tech-stack:
  added: []
  patterns: [ledger-layout, figma-pagination]
key-files:
  modified:
    - convision-front/src/components/ui/data-table/EntityTable.tsx
    - convision-front/src/components/ui/data-table/DataTable.tsx
    - convision-front/src/components/ui/data-table/index.ts
key-decisions:
  - ledger/figma as EntityTable defaults so all migrated pages get Figma spec without explicit props
  - Native <button> for sort header in ledger mode to preserve 11px row height
  - FetchParams and EntityTableProps exported so consuming pages can type their fetchers
requirements-completed: []
duration: "1 min"
completed: "2026-04-25"
---

# Phase 10 Plan 01: Core — EntityTable defaults + DataTable ledger sort button Summary

EntityTable now defaults to `tableLayout='ledger'`, `paginationVariant='figma'`, `ledgerBorderMode='figma'`, `showPageSizeSelect=false`; DataTable renders a native compact `<button>` for sortable column headers in ledger mode instead of a ghost Button (preserves 11px header row); `EntityTableProps`, `FetchParams`, and `PaginatedResult` are all exported from the barrel.

**Duration:** 1 min | **Start:** 2026-04-25T02:25:07Z | **End:** 2026-04-25T02:26:39Z | **Tasks:** 3 | **Files:** 3

**Next:** Ready for Wave 2 — plans 10-02 through 10-06 can now run in parallel.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Update EntityTable parameter defaults | e0063cf | EntityTable.tsx |
| 2 | Fix DataTable sort button for ledger/figma variant | cf0a46e | DataTable.tsx |
| 3 | Export EntityTableProps and PaginatedResult from barrel | f491f5e | EntityTable.tsx, index.ts |

---

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed. **Impact:** none.

---

## Self-Check: PASSED

- `grep "tableLayout = 'ledger'" convision-front/src/components/ui/data-table/EntityTable.tsx` → match ✓
- `grep "paginationVariant = 'figma'" convision-front/src/components/ui/data-table/EntityTable.tsx` → match ✓
- `grep "ledgerBorderMode = 'figma'" convision-front/src/components/ui/data-table/EntityTable.tsx` → match ✓
- `grep "showPageSizeSelect = false" convision-front/src/components/ui/data-table/EntityTable.tsx` → match ✓
- `grep "isLedgerMode" convision-front/src/components/ui/data-table/DataTable.tsx` → match ✓
- `grep "h-3 w-3 text-\[#b4b5bc\]" convision-front/src/components/ui/data-table/DataTable.tsx` → match ✓
- `grep "hover:bg-transparent" convision-front/src/components/ui/data-table/DataTable.tsx` → match ✓
- `grep "export type EntityTableProps" convision-front/src/components/ui/data-table/EntityTable.tsx` → match ✓
- `grep "export type FetchParams" convision-front/src/components/ui/data-table/EntityTable.tsx` → match ✓
- `grep "EntityTableProps" convision-front/src/components/ui/data-table/index.ts` → match ✓
- `npx tsc --noEmit` → 0 errors ✓
- `git log --oneline --grep="10-01"` → 3 commits found ✓
