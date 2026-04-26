DROP TABLE IF EXISTS inventory_adjustments;
DROP TABLE IF EXISTS stock_movements;

DROP INDEX IF EXISTS idx_products_product_type;
DROP INDEX IF EXISTS idx_products_tracks_stock;

ALTER TABLE products
  DROP COLUMN IF EXISTS tracks_stock,
  DROP COLUMN IF EXISTS product_type;
