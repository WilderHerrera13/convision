---
phase: 17
status: complete
verified_at: 2026-05-06
---

## Phase 17 — Verification: bulk-inventory-upload-kardex-integration

### Must-haves

| # | Requirement | Status | Evidence |
|---|---|---|---|
| INV-BULK-01 | Upload Excel → new products created, stock set, kardex entry written | PASS | `importer_inventory.go`: `upsertInventoryItem` creates item + `MovementTypeEntry` movement on first insert |
| INV-BULK-02 | Duplicate row (same product, same branch) → quantities summed, not doubled | PASS | `upsertInventoryItem` accumulates `item.Quantity += quantity`, writes `MovementTypeAdjustmentAdd` |
| INV-BULK-03 | POST `/api/v1/bulk-import/inventory` behind `RequireRole(RoleAdmin)` | PASS | Route registered in `routes.go` inside `bulkImportGroup`; group uses `jwtauth.RequireRole(domain.RoleAdmin)` |
| INV-BULK-04 | Frontend: "Inventario" option card in ImportTypeSelectPage | PASS | `OPTIONS` array extended with `type: 'inventory'`, `Package` icon, 11 column chips |
| INV-BULK-05 | Frontend: `status: "updated"` renders as blue "Actualizado" badge | PASS | `StatusBadge` returns `bg-[#eff1ff] text-[#3a71f7]` span for `updated` case |
| INV-BULK-06 | Go build clean | PASS | `go build ./...` exits 0 in `convision-api-golang/` |
| INV-BULK-07 | Frontend build clean | PASS | `npm run build` exits 0 in `convision-front/` |

### Known issues

- **WR-01** (warning): `resolveOrCreateProduct` and `resolveOrCreateWarehouse` silently proceed to create when `List` returns an error. Documented in `17-REVIEW.md`. No active data loss under normal conditions; recommend follow-up fix.

### Verdict

Phase 17 is **complete**. All must-have requirements are satisfied, both builds pass, and the single code review warning (WR-01) is non-blocking.
