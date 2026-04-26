-- 1. Add product classification columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type VARCHAR(30) NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS tracks_stock BOOLEAN NOT NULL DEFAULT true;

-- 2. Backfill product_type from existing attribute sub-tables
UPDATE products p
SET product_type = 'lens', tracks_stock = false
WHERE EXISTS (SELECT 1 FROM product_lens_attributes pla WHERE pla.product_id = p.id);

UPDATE products p
SET product_type = 'frame', tracks_stock = true
WHERE EXISTS (SELECT 1 FROM product_frame_attributes pfa WHERE pfa.product_id = p.id)
  AND p.product_type = 'other';

UPDATE products p
SET product_type = 'contact_lens', tracks_stock = true
WHERE EXISTS (SELECT 1 FROM product_contact_lens_attributes pcla WHERE pcla.product_id = p.id)
  AND p.product_type = 'other';

-- 3. Index product_type for catalog filtering
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_tracks_stock ON products(tracks_stock);

-- 4. Kardex: stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id                    BIGSERIAL PRIMARY KEY,
  product_id            INTEGER NOT NULL REFERENCES products(id),
  warehouse_id          INTEGER NOT NULL REFERENCES warehouses(id),
  warehouse_location_id INTEGER REFERENCES warehouse_locations(id),
  movement_type         VARCHAR(30) NOT NULL,
  reference_type        VARCHAR(30),
  reference_id          INTEGER,
  quantity_before       INTEGER NOT NULL,
  quantity_delta        INTEGER NOT NULL,
  quantity_after        INTEGER NOT NULL,
  unit_cost             NUMERIC(12,2) NOT NULL DEFAULT 0,
  performed_by          INTEGER REFERENCES users(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id    ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id  ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference     ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at    ON stock_movements(created_at DESC);

-- 5. inventory_adjustments table
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  adjustment_reason VARCHAR(50) NOT NULL,
  quantity_delta    INTEGER NOT NULL,
  quantity_before   INTEGER NOT NULL,
  quantity_after    INTEGER NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending_approval',
  requested_by      INTEGER NOT NULL REFERENCES users(id),
  approved_by       INTEGER REFERENCES users(id),
  notes             TEXT,
  evidence_url      TEXT,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_adjustments_item_id      ON inventory_adjustments(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inv_adjustments_status       ON inventory_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_inv_adjustments_requested_by ON inventory_adjustments(requested_by);
