---
plan: 12-04
status: complete
completed: 2026-04-24
---

# Summary: Plan 12-04 — Frontend Changes

## What was built
The standalone `orders` route and `OrderList` import were removed from `App.tsx` and the receptionist sidebar navigation in `AdminLayout.tsx`. The admin `LaboratoryOrderDetail.tsx` was updated to display `sale.sale_number` when a linked sale exists, falling back to `order_number` for manually created orders. The `laboratoryOrderService.ts` already had the correct `sale_number` field in the `sale?` sub-interface, and `NewLaboratoryOrder.tsx` already lacked any hard lens requirement.

## key-files
### created
- (none)

### modified
- convision-front/src/App.tsx
- convision-front/src/layouts/AdminLayout.tsx
- convision-front/src/pages/admin/LaboratoryOrderDetail.tsx

## Tasks completed
- ✓ 04-A: Removed `OrderList` import and `path: "orders"` route from `App.tsx`
- ✓ 04-B: `laboratoryOrderService.ts` already had `sale_number: string` in `sale?` sub-interface — no change needed
- ✓ 04-C: Updated admin `LaboratoryOrderDetail.tsx` to show `sale?.sale_number ?? order_number`
- ✓ 04-D: `LabOrderDetail.tsx` (receptionist) does not exist in the base commit — not applicable
- ✓ 04-E: `NewLaboratoryOrder.tsx` has no hard `lens_id` required validation — no change needed
- ✓ 04-G: Removed "Órdenes" nav link (`/receptionist/orders`) from receptionist sidebar in `AdminLayout.tsx`
- ✓ 04-F: `npm run build` exits 0 with no TypeScript errors

## Deviations
- Task 04-D: `convision-front/src/pages/receptionist/LabOrderDetail.tsx` does not exist in the base commit (34c046b). The file was previously only in a prior worktree's uncommitted state. No receptionist lab-order detail route exists in `App.tsx`, so this task was skipped.
- Task 04-B: `sale_number` was already present in the interface — confirmed as correct, no change required.
- Task 04-E: No lens-required validation existed in `NewLaboratoryOrder.tsx` — confirmed as correct, no change required.

## Self-Check
PASSED — `npm run build` exits 0, all acceptance criteria verified with grep.
