-- Migration 017: add clinic_id to warehouse_locations, inventory_items, inventory_transfers.
-- warehouses already has clinic_id from migration 014.

-- ── warehouse_locations ────────────────────────────────────────────────────────
ALTER TABLE warehouse_locations
    ADD COLUMN IF NOT EXISTS clinic_id BIGINT REFERENCES clinics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_clinic_id
    ON warehouse_locations(clinic_id);

-- ── inventory_items ────────────────────────────────────────────────────────────
ALTER TABLE inventory_items
    ADD COLUMN IF NOT EXISTS clinic_id BIGINT REFERENCES clinics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_clinic_id
    ON inventory_items(clinic_id);

-- ── inventory_transfers ────────────────────────────────────────────────────────
ALTER TABLE inventory_transfers
    ADD COLUMN IF NOT EXISTS clinic_id BIGINT REFERENCES clinics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_clinic_id
    ON inventory_transfers(clinic_id);
