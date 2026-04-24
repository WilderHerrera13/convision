-- Tenant migration 015: warehouse_locations, inventory_items, inventory_transfers
-- Also aligns warehouses table with the domain struct (adds code, address, city, status, notes).

-- ── Fix warehouses schema ─────────────────────────────────────────────────────
-- Migration 014 created warehouses with (location, clinic_id, is_active).
-- The domain struct uses (code, address, city, status, notes) instead.
-- Add the missing columns idempotently.
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS code       TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS address    TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS city       TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS status     VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS notes      TEXT;

-- Unique index on code (mirrors gorm:"uniqueIndex" in domain struct).
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code) WHERE code IS NOT NULL;

-- Add CHECK on status values.
ALTER TABLE warehouses
    DROP CONSTRAINT IF EXISTS warehouses_status_check;
ALTER TABLE warehouses
    ADD CONSTRAINT warehouses_status_check
    CHECK (status IN ('active','inactive'));

-- updated_at trigger for warehouses (may already exist, guard with DO block).
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_warehouses_updated_at'
    ) THEN
        CREATE TRIGGER set_warehouses_updated_at
        BEFORE UPDATE ON warehouses
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- ── warehouse_locations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id              BIGSERIAL    PRIMARY KEY,
    warehouse_id    BIGINT       NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name            TEXT         NOT NULL,
    code            TEXT,
    type            VARCHAR(50),
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active','inactive')),
    description     TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- A location name must be unique within a warehouse.
    CONSTRAINT uq_warehouse_location_name UNIQUE (warehouse_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_locations_code
    ON warehouse_locations(code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_warehouse_id
    ON warehouse_locations(warehouse_id);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_warehouse_locations_updated_at'
    ) THEN
        CREATE TRIGGER set_warehouse_locations_updated_at
        BEFORE UPDATE ON warehouse_locations
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- ── inventory_items ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
    id                      BIGSERIAL    PRIMARY KEY,
    product_id              BIGINT       NOT NULL REFERENCES products(id)           ON DELETE RESTRICT,
    warehouse_id            BIGINT       NOT NULL REFERENCES warehouses(id)         ON DELETE RESTRICT,
    warehouse_location_id   BIGINT       REFERENCES warehouse_locations(id)         ON DELETE SET NULL,
    quantity                INTEGER      NOT NULL DEFAULT 0,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'available'
                                         CHECK (status IN ('available','reserved','damaged','sold','returned','lost')),
    notes                   TEXT,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- A product can only appear once per location.
    CONSTRAINT uq_inventory_item_product_location UNIQUE (product_id, warehouse_location_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_product_warehouse
    ON inventory_items(product_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_status
    ON inventory_items(status) WHERE status = 'available';

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_inventory_items_updated_at'
    ) THEN
        CREATE TRIGGER set_inventory_items_updated_at
        BEFORE UPDATE ON inventory_items
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- ── inventory_transfers ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_transfers (
    id                          BIGSERIAL    PRIMARY KEY,
    lens_id                     BIGINT       REFERENCES lenses(id)              ON DELETE SET NULL,
    source_location_id          BIGINT       NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
    destination_location_id     BIGINT       NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
    quantity                    INTEGER      NOT NULL,
    transferred_by              BIGINT       REFERENCES users(id)               ON DELETE SET NULL,
    notes                       TEXT,
    status                      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                             CHECK (status IN ('pending','completed','cancelled')),
    completed_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_status
    ON inventory_transfers(status);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_lens_id
    ON inventory_transfers(lens_id);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_inventory_transfers_updated_at'
    ) THEN
        CREATE TRIGGER set_inventory_transfers_updated_at
        BEFORE UPDATE ON inventory_transfers
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
