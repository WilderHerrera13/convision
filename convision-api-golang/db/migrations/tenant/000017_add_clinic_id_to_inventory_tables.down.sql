DROP INDEX IF EXISTS idx_inventory_transfers_clinic_id;
ALTER TABLE inventory_transfers DROP COLUMN IF EXISTS clinic_id;

DROP INDEX IF EXISTS idx_inventory_items_clinic_id;
ALTER TABLE inventory_items DROP COLUMN IF EXISTS clinic_id;

DROP INDEX IF EXISTS idx_warehouse_locations_clinic_id;
ALTER TABLE warehouse_locations DROP COLUMN IF EXISTS clinic_id;
