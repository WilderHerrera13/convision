-- Rollback migration 015
DROP TABLE IF EXISTS inventory_transfers;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS warehouse_locations;

-- Remove columns added to warehouses (leave table intact — created by 014)
ALTER TABLE warehouses DROP COLUMN IF EXISTS notes;
ALTER TABLE warehouses DROP COLUMN IF EXISTS status;
ALTER TABLE warehouses DROP COLUMN IF EXISTS city;
ALTER TABLE warehouses DROP COLUMN IF EXISTS address;
ALTER TABLE warehouses DROP COLUMN IF EXISTS code;
ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS warehouses_status_check;
DROP INDEX IF EXISTS idx_warehouses_code;
