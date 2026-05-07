---
plan: 17-02
phase: 17
status: complete
started: 2026-05-06
completed: 2026-05-06
---

## What Was Built

Added "Inventario" as a fully functional import type in the bulk-import frontend module. The feature includes: a new option card in the type-selection screen, `INVENTORY_CONFIG` with 11 column chips and instructional sidebar content, a blue "Actualizado" badge for the new `updated` status (distinguishable from the existing green "Creado" and yellow "Duplicado" badges), and the `uploadInventory` API call posting to the new backend endpoint.

## Key Files

### Modified
- `convision-front/src/services/bulkImportService.ts` — `ImportType` extended with `'inventory'`, `RecordStatus` extended with `'updated'`, `uploadInventory` method added
- `convision-front/src/pages/admin/bulk-import/BulkImportPage.tsx` — `StatusBadge` updated with `updated` case, `INVENTORY_CONFIG` const added, `importType`/`config`/`dataKeys`/`searchPlaceholder`/`handleProcess` all wired for `'inventory'`
- `convision-front/src/pages/admin/bulk-import/ImportTypeSelectPage.tsx` — `Package` icon imported, `OPTIONS` array extended with inventory card

## Decisions Made

- `dataKeys` for inventory uses lowercase column names `['código', 'descripción', 'cant', 'sede']` — matches normalized Excel headers (the service lowercases all headers before returning)
- `App.tsx` wildcard route `bulk-import/:type` already covers `/admin/bulk-import/inventory` — no route change needed
- `updated` badge uses `bg-[#eff1ff] text-[#3a71f7]` (app accent blue) to visually distinguish from `created` (green) and `skipped` (yellow)

## Commits

- `34a7e34` feat(17-02): add inventory ImportType, updated RecordStatus, uploadInventory method
- `4af6d1d` feat(17-02): add Actualizado badge, INVENTORY_CONFIG, and inventory wiring in BulkImportPage
- `ecfb43f` feat(17-02): add Inventario option card to ImportTypeSelectPage

## Self-Check

- [x] "Inventario" option card appears in bulk import type selection page
- [x] Navigating to `/admin/bulk-import/inventory` renders upload UI with INVENTORY_CONFIG
- [x] 11 column chips match Excel column names
- [x] `status: 'updated'` renders as blue "Actualizado" badge
- [x] `uploadInventory` posts to `/api/v1/bulk-import/inventory`
- [x] `npm run build` exits 0 with no TypeScript errors
