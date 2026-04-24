ALTER TABLE inventory_transfers
    DROP CONSTRAINT IF EXISTS inventory_transfers_product_id_fkey;

ALTER TABLE inventory_transfers
    ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE inventory_transfers RENAME COLUMN product_id TO lens_id;

ALTER TABLE inventory_transfers
    ADD CONSTRAINT inventory_transfers_lens_id_fkey
    FOREIGN KEY (lens_id) REFERENCES lenses(id) ON DELETE SET NULL;
