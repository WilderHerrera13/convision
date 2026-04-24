ALTER TABLE inventory_transfers RENAME COLUMN lens_id TO product_id;

ALTER TABLE inventory_transfers
    DROP CONSTRAINT IF EXISTS inventory_transfers_lens_id_fkey;

ALTER TABLE inventory_transfers
    ADD CONSTRAINT inventory_transfers_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE inventory_transfers
    ALTER COLUMN product_id SET NOT NULL;
