# Phase 13: Unified Product-Inventory WMS Foundation — Context

**Gathered:** 2026-04-26
**Status:** Ready for planning
**Source:** User directive — inventory module empty after lens import

<domain>
## Phase Boundary

This phase delivers the WMS (Warehouse Management System) foundation for the optics clinic chain. It unifies the product catalog (lenses are products, not a separate entity), adds Kardex transactional tracking for all stock operations, implements a manual adjustment approval flow, and fixes the frontend inventory module so imported lenses appear as a lens catalog (even though they have no physical stock).

**Out of scope this phase:** Sales state machine (reserve → release), reorder alerts/cron triggers, multi-clinic stock synchronization, barcode scanning.

</domain>

<decisions>
## Implementation Decisions

### D-01: Unified Product Model
- All products share the `products` table. No separate behavioral distinction at the DB level beyond the type column.
- `product_type` column added to `products` as `varchar(30) NOT NULL DEFAULT 'other'`.
- Valid values: `lens`, `frame`, `contact_lens`, `liquid`, `accessory`, `other`.
- `tracks_stock` boolean column added to `products` as `BOOLEAN NOT NULL DEFAULT true`.
- Lenses always have `tracks_stock = false` (made-to-order). Frames, liquids, contact_lens, accessories have `tracks_stock = true` by default.

### D-02: Lens-as-Product (Backend Unification)
- The bulk lens import (`POST /v1/portfolio/lenses/bulk`) must create records in `products` + `product_lens_attributes`, NOT in the `lenses` table.
- The old `domain.Lens` struct and `LensRepository` are NOT deleted (they still serve existing lab orders that reference `lens_id`). But new imports go through `Product`.
- A backfill migration is NOT required in this phase — existing `lenses` records are untouched. New imports go to `products`.
- The `GET /v1/inventory/stock` endpoint (which currently calls `TotalStockPerProduct` on `inventory_items`) gets a new companion endpoint: `GET /v1/inventory/lens-catalog` that returns products with `product_type = 'lens'` paginated.

### D-03: Kardex — stock_movements Table
- Every mutating operation on `inventory_items.quantity` MUST write a `stock_movements` row in the same DB transaction.
- `stock_movements` columns: `id`, `product_id`, `warehouse_id`, `warehouse_location_id`, `movement_type` (varchar 30), `reference_type` (varchar 30 nullable), `reference_id` (int nullable), `quantity_before`, `quantity_delta`, `quantity_after`, `unit_cost` (decimal), `performed_by` (FK users), `notes`, `created_at`.
- `movement_type` values: `entry` (stock increases), `exit` (stock decreases/sale), `transfer_out`, `transfer_in`, `reserve`, `release`, `adjustment_add`, `adjustment_sub`.
- `reference_type` values: `manual`, `transfer`, `sale`, `purchase`, `adjustment`.
- Double-entry principle: a `transfer_out` on source MUST have a matching `transfer_in` on destination in the same transaction.

### D-04: inventory_adjustments Table
- `inventory_adjustments` columns: `id`, `inventory_item_id`, `adjustment_reason` (varchar 50), `quantity_delta` (int signed), `quantity_before`, `quantity_after`, `status` (varchar 20: pending_approval / approved / rejected), `requested_by` (FK users), `approved_by` (FK users nullable), `notes`, `evidence_url` (nullable), `reviewed_at` (nullable), `created_at`, `updated_at`.
- Reason codes: `damage`, `expiry`, `theft`, `count_correction`, `return`, `warranty`, `supplier_defect`.
- Only `approved` adjustments modify the `inventory_items.quantity` and write a `stock_movement`.
- Approval endpoint: `PATCH /v1/inventory/adjustments/:id/approve` and `.../reject` (admin role only).

### D-05: Frontend Inventory Module Layout
- The "Stock" tab in `/admin/inventory` shows two sub-sections:
  1. **"Catálogo de Lentes"** — EntityTable fetching `GET /v1/inventory/lens-catalog?page=&per_page=` — shows lens products from `products` table with `product_type = 'lens'`. Columns: Código, Lente (identifier), Marca, Tipo, Estado (enabled/disabled). No stock column (lenses don't have stock). Search by internal_code/identifier.
  2. **"Stock Físico"** — existing EntityTable fetching `GET /v1/inventory/stock` (returns `inventory_items` aggregated by product, for products with `tracks_stock = true`). Columns: Código, Producto, Marca, Bodega, Stock (quantity badge). 
- These two sections are stacked vertically on the same Stock tab, separated by a divider with a section header.

### D-06: Backfill Logic
- After the migration adds `product_type` and `tracks_stock` to `products`, existing `products` rows need their `product_type` inferred from their associated attribute tables:
  - Has `product_lens_attributes` → `product_type = 'lens'`, `tracks_stock = false`
  - Has `product_frame_attributes` → `product_type = 'frame'`, `tracks_stock = true`
  - Has `product_contact_lens_attributes` → `product_type = 'contact_lens'`, `tracks_stock = true`
  - None → `product_type = 'other'`, `tracks_stock = true`
- The UP migration includes this backfill as SQL UPDATE statements.

### Agent's Discretion
- Go service method naming follows existing `camelCase` patterns in `inventory/service.go`.
- New repository interface methods follow existing `GetByID / Create / Update / Delete / List` conventions.
- Frontend: existing EntityTable pattern from `convision-front/src/components/ui/data-table/EntityTable.tsx` must be used without modification.
- Error messages stay in Spanish following existing domain error patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Domain Models
- `convision-api-golang/internal/domain/product.go` — Product, ProductLensAttributes, ProductFrameAttributes, ProductContactLensAttributes
- `convision-api-golang/internal/domain/inventory.go` — InventoryItem, InventoryTransfer, Warehouse, WarehouseLocation
- `convision-api-golang/internal/domain/lens.go` — Lens (kept for backward compat with lab orders)

### Existing Services
- `convision-api-golang/internal/inventory/service.go` — InventoryService (all stock operations to be enhanced with Kardex)
- `convision-api-golang/internal/product/service.go` — ProductService

### Existing Repositories
- `convision-api-golang/internal/platform/storage/postgres/lens_repository.go` — LensRepository (bulk import currently writes here)
- `convision-api-golang/internal/platform/storage/postgres/inventory_item_repository.go`

### Existing Migrations
- Last migration: `convision-api-golang/db/migrations/platform/000015_create_prescriptions.up.sql`
- Next: `000016_unified_product_wms.up.sql`

### Frontend Inventory Components
- `convision-front/src/components/inventory/InventoryStock.tsx` — current stock component (shows empty for lenses)
- `convision-front/src/services/inventoryService.ts` — inventory API calls
- `convision-front/src/components/ui/data-table/EntityTable.tsx` — reusable table component

### Transport Layer
- `convision-api-golang/internal/transport/http/v1/handler_inventory.go` — inventory HTTP handlers
- `convision-api-golang/internal/transport/http/v1/routes.go` — route registration
- `convision-api-golang/internal/transport/http/v1/handler_portfolio.go` — lens bulk import handler (currently writes to `lenses` table)

</canonical_refs>

<specifics>
## Specific Ideas

- The `stock_movements` table enables future reports: "¿Cuántas unidades de montura X vendimos este mes?" — query movements with reference_type='sale'.
- The adjustment approval flow mirrors real optical clinic operations: a damaged frame requires a photo and admin sign-off before it leaves the count.
- The `lens-catalog` endpoint supports the sales prescription filter — `GET /v1/inventory/lens-catalog?sphere_od=-2.00&cylinder_od=-0.75` returns compatible lenses for a patient's prescription.
- Double-entry verification: `SELECT SUM(quantity_delta) FROM stock_movements WHERE product_id = X AND warehouse_id = Y` must equal the current `inventory_items.quantity` for that product+warehouse combination.

</specifics>

<deferred>
## Deferred Ideas

- Sales state machine (montura reservation on sale create, release on cancellation) — Phase 14
- Reorder point alerts (cron job, min_stock_threshold column) — Phase 14
- Expiry/lot tracking (batch_number, expiry_date on stock_movements) — Phase 14
- Lab delay SLA triggers — Phase 14
- Multi-clinic stock visibility — future milestone
- Barcode scanning integration — future milestone

</deferred>

---

*Phase: 13-unified-product-inventory-wms*
*Context gathered: 2026-04-26*
