---
plan: 08-03
status: complete
---

## Summary

Fixed all non-transfer inventory bugs identified in the phase-08 audit. This plan completed nine tasks covering the LensID→ProductID rename (domain + DB migration), DeleteLocation inventory guard, AdjustStock rewrite with row-level locking, status enum validation for both items and transfers, ItemUpdateInput zero-value pointer fix, the missing warehouse_location_id filter in ListInventoryItems, and a unified GetTotalStock response shape.

## Key Files

### Created
- path: convision-api-golang/db/migrations/tenant/000016_rename_lens_id_to_product_id.up.sql
  purpose: Renames inventory_transfers.lens_id → product_id, drops old FK, adds FK to products, sets NOT NULL
- path: convision-api-golang/db/migrations/tenant/000016_rename_lens_id_to_product_id.down.sql
  purpose: Reverses the column rename and FK change for rollback

### Modified
- path: convision-api-golang/internal/domain/inventory.go
  change: InventoryTransfer.LensID *uint → ProductID uint (not null); Product association added; WarehouseLocation gets uniqueIndex:uq_location_name_warehouse on (warehouse_id, name)
- path: convision-api-golang/internal/inventory/service.go
  change: TransferCreateInput.LensID *uint → ProductID uint binding:required; CreateTransfer stock pre-check uses ProductID directly; CompleteTransfer stock movement uses t.ProductID; DeleteLocation now guards against active inventory; AdjustStock removed, replaced with AdjustStockByItemID (SELECT FOR UPDATE in transaction); validateItemStatus and validateTransferStatus helpers added; CreateItem and UpdateItem use validateItemStatus; UpdateTransfer calls validateTransferStatus; ItemUpdateInput.Quantity int → *int, Notes string → *string with nil guards in UpdateItem
- path: convision-api-golang/internal/platform/storage/postgres/inventory_transfer_repository.go
  change: Filter allowlist: "lens_id" → "product_id"; withRelations now Preloads "Product"
- path: convision-api-golang/internal/transport/http/v1/handler_inventory.go
  change: AdjustInventory rewritten to accept inventory_item_id + delta and call AdjustStockByItemID; ListInventoryItems now parses warehouse_location_id query param; GetTotalStock unified to always call TotalStockPerProduct and return {data, total_units}

## Decisions

- CompleteTransfer in 08-02 used a `LensID != nil` guard as a temporary measure. With 08-03-T1/T2 renaming the field to a non-nullable ProductID, the nil guard was removed and stock movement now always executes unconditionally.
- AdjustStockByItemID logs the adjustment via zap before the transaction. If the transaction fails, the log still records the attempt — acceptable trade-off since there is no audit table in the schema yet.
- `validateItemStatus` returns `InventoryItemStatusAvailable` as the default when the input is empty — consistent with the CreateItem behavior before this fix and with the DB column default.
- The scalar `TotalStock()` service and repository methods are retained as internal utilities (used by nothing via HTTP) to avoid breaking any future callers without a separate removal task.
- `Delta int` with `binding:"required"` in the new AdjustInventory handler rejects delta=0 (no-op adjustment) — intentional per the plan note.

## Self-Check: PASSED
