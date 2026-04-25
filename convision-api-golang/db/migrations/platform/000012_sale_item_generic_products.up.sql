-- platform migration 000005_sale_item_generic_products — created 2026-04-24
-- Add generic product columns to sale_items table
ALTER TABLE sale_items
    ADD COLUMN IF NOT EXISTS product_id   INTEGER,
    ADD COLUMN IF NOT EXISTS product_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS name         TEXT,
    ADD COLUMN IF NOT EXISTS description  TEXT;
