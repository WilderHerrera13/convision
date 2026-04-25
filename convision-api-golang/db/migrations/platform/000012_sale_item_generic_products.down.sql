-- platform migration 000005_sale_item_generic_products — created 2026-04-24
-- Remove generic product columns from sale_items table
ALTER TABLE sale_items
    DROP COLUMN IF EXISTS product_id,
    DROP COLUMN IF EXISTS product_type,
    DROP COLUMN IF EXISTS name,
    DROP COLUMN IF EXISTS description;
