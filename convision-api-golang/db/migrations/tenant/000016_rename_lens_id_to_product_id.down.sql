ALTER TABLE inventory_transfers
    DROP CONSTRAINT IF EXISTS inventory_transfers_product_id_fkey;

ALTER TABLE inventory_transfers
    ALTER COLUMN product_id DROP NOT NULL;

-- Rename product_id → lens_id only if the rename has already been applied.
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inventory_transfers' AND column_name = 'product_id'
    ) THEN
        ALTER TABLE inventory_transfers RENAME COLUMN product_id TO lens_id;
    END IF;
END $$;

-- Restore the FK to lenses only if the lenses table still exists.
-- WARNING: this down migration is unsafe if the lenses table has been dropped.
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'lenses'
    ) THEN
        ALTER TABLE inventory_transfers
            ADD CONSTRAINT inventory_transfers_lens_id_fkey
            FOREIGN KEY (lens_id) REFERENCES lenses(id) ON DELETE SET NULL;
    END IF;
END $$;
