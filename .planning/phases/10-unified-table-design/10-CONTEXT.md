# Phase 10: Unified Table Design — Entity Tables — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Source:** /ftc Figma node 241:502 + codebase audit

<domain>
## Phase Boundary

Standardize every entity-list table in the React frontend so that it uses the centralized `EntityTable` component with the Figma DS design (node 241:502). No new backend work. No changes to clinical/print/detail-breakdown tables that are not entity lists.

Key Figma design spec extracted from node 241:502:

| Element | Spec |
|---------|------|
| Container | `bg-white border border-[#e5e5e9] rounded-[8px]` |
| Toolbar | `h-[52px] px-5`, title 14px semibold `#121215`, subtitle 11px regular `#7d7d87` |
| Search input | `h-[34px] w-[220px] rounded-[6px] border-[#e5e5e9] text-[12px]` |
| CTA button | `h-[34px] rounded-[6px] bg-[#8753ef] text-white text-[12px] semibold` |
| Column header row | `bg-[#f5f5f6] h-9`, text 11px semibold `#7d7d87`, `px-3` |
| Data row | `bg-white border-b border-[#e5e5e9] h-12`, `px-3` |
| Primary cell text | 13px semibold `#121212` |
| Secondary cell text | 12px regular `#7d7d87` |
| Date cell text | 12px regular `#3f3f47` |
| Status badge | `rounded-[99px] px-[10px] py-[3px]`, 11px semibold |
| Action button | `size-[32px] rounded-[6px]` — view: `bg-[#eff4ff] border-[#c5d3f8]`, edit: `bg-[#f5f5f7] border-[#e0e0e4]`, delete: `bg-[#fff0f0] border-[#f5baba]` |
| Pagination footer | `bg-white border-t border-[#e5e5e9] h-12 px-5`, "Mostrando X–Y de Z registros" |
| Pagination range pill | `bg-[#f5f5f6] rounded-[4px] px-1.5`, 12px semibold `#121215` |
| Page button | `size-[32px] rounded-[6px] border border-[#e5e5e9]` |
| Active page | `bg-[#121215] text-white` |

The canonical reference is the patients list at `http://localhost:4300/admin/patients` — this table already matches the Figma design and has sort buttons on each column. All other entity list tables must be brought to the same standard.

</domain>

<decisions>
## Implementation Decisions

### D-01: EntityTable is the ONLY allowed table component for entity lists
Every entity list page MUST use EntityTable. Direct DataTable usage with custom pagination/search state is forbidden for list pages. EntityTable handles search, pagination, query, and toolbar internally.

### D-02: EntityTable defaults changed to Figma design
`tableLayout` default → `'ledger'`
`ledgerBorderMode` default → `'figma'`
`paginationVariant` default → `'figma'`
`showPageSizeSelect` default → `false` (the Figma toolbar doesn't show a per-page selector by default)

### D-03: Sort button in ledger/figma variant
The current `<Button variant="ghost">` wrapper must NOT be used in the ledger variant because it adds height/padding that breaks the 11px header row. In ledger mode, render a plain `<button>` (or just a span) with the header text and an `ArrowUpDown` icon (12px, text-[#b4b5bc]) that only shows on hover, replacing the full-width ghost button.

### D-04: EntityTableProps exported from barrel
`EntityTableProps<T>` must be exported from `src/components/ui/data-table/index.ts` so callers can type their column definitions and fetcher inline.

### D-05: Migration pattern for pages
Each page migration follows this pattern:
1. Remove local `page`, `perPage`, `search`, `isLoading` state managed for the table
2. Remove direct `useQuery` for the table list (EntityTable manages its own query)
3. Keep page-level filter state (e.g. `filterStatus`, date ranges) — pass as `extraFilters` to EntityTable
4. Pass `toolbarLeading` with a title + subtitle node (same structure as Figma: title 14px semibold + subtitle 11px muted)
5. Pass `toolbarTrailing` with the "New" CTA button and any filter controls
6. Keep all page dialogs (create/edit/delete) with their own state untouched
7. EntityTable's `onRowClick` wires row-click navigation

### D-06: Excluded tables (NOT migrated)
These use raw shadcn `Table` or shadcn primitives for non-entity-list purposes and are excluded:
- `CashCloseDetail.tsx`, `SaleDetail.tsx`, `PurchaseDetail.tsx`, `SupplierPaymentDetail.tsx` (detail breakdowns)
- `AdvisorCashClose*.tsx` panels (structured forms with table layout)
- `CashCloseCalendar.tsx` (calendar grid)
- `DailyReportAttentionTable.tsx`, `PayrollCalculate.tsx` (summary/report tables)
- `NewSale.tsx`, `NewPurchase.tsx`, `NewQuote.tsx` (line-item entry tables)
- `LaboratoryOrderDetail.tsx`, `LaboratoryOrderDelayAlerts.tsx` (detail views)
- All clinical form tables (MUI) — different stack
- Print layouts

### D-07: InventoryStock component
`InventoryStock.tsx` uses DataTable internally. It is embedded in pages as a component, not a list page. Migrate it to EntityTable if its use is as an entity list; otherwise leave it for a future audit.

### D-08: Dashboard tables
`SpecialistDashboard.tsx` and `ReceptionistDashboard.tsx` use DataTable for recent-activity previews. These are NOT full entity lists (no pagination, limited rows). Migrate only if they have custom pagination; otherwise apply the `tableLayout='ledger'` + `ledgerBorderMode='figma'` props directly to make them visually consistent without switching to EntityTable.

### the agent's Discretion
- Order/size of per-page options
- Whether to show the page-size select on any specific EntityTable instance (default off per D-02, but individual pages may re-enable if needed)
- Exact subtitle text for toolbar (use actual total count or a static label depending on what's available)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Centralized table components
- `convision-front/src/components/ui/data-table/DataTable.tsx` — Core table, sort button logic, ledger/figma styles
- `convision-front/src/components/ui/data-table/EntityTable.tsx` — Wrapper with query/pagination/search/toolbar
- `convision-front/src/components/ui/data-table/index.ts` — Barrel exports

### Canonical reference pages
- `convision-front/src/pages/admin/Patients.tsx` — READ THIS FIRST before migrating any admin page; defines the canonical toolbar/column/action pattern
- `convision-front/src/pages/receptionist/Appointments.tsx` — canonical for specialist and receptionist pages after plan 10-06 migration

### Design tokens (from Figma node 241:502)
Already encoded in DataTable.tsx ledger/figma branch — see `tableLayout='ledger'` + `ledgerBorderMode='figma'` rendering paths.

### Project rules
- `.cursor/rules/convision-app.mdc` — Rule: all tables must use EntityTable

</canonical_refs>

<specifics>
## Specific Ideas

### Sort button visual spec (ledger/figma variant)
```tsx
// In DataTable.tsx — header render for ledger variant with enableSorting
<button
  onClick={() => col.toggleSorting()}
  className="flex items-center gap-1 text-[11px] font-semibold text-[#7d7d87] hover:text-[#121215] transition-colors"
>
  {column.header}
  <ArrowUpDown className="h-3 w-3 text-[#b4b5bc]" />
</button>
```

### EntityTable toolbar reference (from Figma 241:503–511)
```tsx
toolbarLeading={
  <div className="flex flex-col gap-0.5">
    <span className="text-[14px] font-semibold text-[#121215]">Pacientes</span>
    <span className="text-[11px] text-[#7d7d87]">Base de datos / {total} registros</span>
  </div>
}
toolbarTrailing={
  <Button
    onClick={handleNew}
    className="h-[34px] rounded-[6px] bg-[#8753ef] px-4 text-[12px] font-semibold text-white hover:bg-[#7040d8]"
  >
    + Nuevo paciente
  </Button>
}
```

### Fetcher pattern (for migration)
```tsx
fetcher={(params) => patientService.list({
  page: params.page,
  per_page: params.per_page,
  search: params.search,
  ...params.filters,
})}
```

</specifics>

<deferred>
## Deferred Ideas

- Dashboard tables (SpecialistDashboard, ReceptionistDashboard) — apply visual props only, no EntityTable migration
- InventoryStock component — audit in a separate phase
- MUI tables in clinical forms — separate tech stack, out of scope
- Print layout tables — semantic HTML, not UI components

</deferred>

---

*Phase: 10-unified-table-design*
*Context gathered: 2026-04-24 via /ftc Figma node 241:502 + codebase audit*
