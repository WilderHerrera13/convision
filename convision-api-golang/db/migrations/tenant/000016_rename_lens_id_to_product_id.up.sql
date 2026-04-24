-- Pre-flight: abort if any transfer row has lens_id IS NULL (SET NOT NULL would fail).
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inventory_transfers' AND column_name = 'lens_id'
    ) THEN
        IF EXISTS (SELECT 1 FROM inventory_transfers WHERE lens_id IS NULL) THEN
            RAISE EXCEPTION 'Cannot migrate: inventory_transfers has rows with lens_id IS NULL';
        END IF;
    END IF;
END $$;

-- Drop the orphaned index created in migration 015 (named after the old column).
DROP INDEX IF EXISTS idx_inventory_transfers_lens_id;

-- Rename lens_id → product_id only if the old column still exists (idempotent).
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inventory_transfers' AND column_name = 'lens_id'
    ) THEN
        ALTER TABLE inventory_transfers RENAME COLUMN lens_id TO product_id;
    END IF;
END $$;

-- Drop the old FK constraint if it exists.
ALTER TABLE inventory_transfers
    DROP CONSTRAINT IF EXISTS inventory_transfers_lens_id_fkey;

-- Add the new FK to products only if it is not already present (idempotent).
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'inventory_transfers'
          AND constraint_name = 'inventory_transfers_product_id_fkey'
    ) THEN
        ALTER TABLE inventory_transfers
            ADD CONSTRAINT inventory_transfers_product_id_fkey
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
    END IF;
END $$;

ALTER TABLE inventory_transfers
    ALTER COLUMN product_id SET NOT NULL;
