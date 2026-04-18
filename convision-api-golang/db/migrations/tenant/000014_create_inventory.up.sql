-- Tenant migration 014: Inventory (warehouses, stock movements, purchases)

CREATE TABLE IF NOT EXISTS warehouses (
    id          BIGSERIAL   PRIMARY KEY,
    name        TEXT        NOT NULL,
    location    TEXT,
    clinic_id   BIGINT      REFERENCES clinics(id) ON DELETE SET NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id              BIGSERIAL      PRIMARY KEY,
    warehouse_id    BIGINT         REFERENCES warehouses(id) ON DELETE SET NULL,
    product_id      BIGINT         REFERENCES products(id) ON DELETE SET NULL,
    lens_id         BIGINT         REFERENCES lenses(id) ON DELETE SET NULL,
    movement_type   TEXT           NOT NULL
                                   CHECK (movement_type IN ('in','out','adjustment','transfer')),
    quantity        INTEGER        NOT NULL,
    unit_cost       NUMERIC(12,2),
    reference       TEXT,
    notes           TEXT,
    created_by      BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse_id ON inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id   ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at   ON inventory_movements(created_at DESC);

CREATE TABLE IF NOT EXISTS purchases (
    id                BIGSERIAL      PRIMARY KEY,
    purchase_number   TEXT           NOT NULL UNIQUE,
    supplier_id       BIGINT         REFERENCES suppliers(id) ON DELETE SET NULL,
    warehouse_id      BIGINT         REFERENCES warehouses(id) ON DELETE SET NULL,
    purchase_date     TIMESTAMPTZ,
    expected_date     TIMESTAMPTZ,
    received_date     TIMESTAMPTZ,
    subtotal          NUMERIC(12,2)  NOT NULL DEFAULT 0,
    tax               NUMERIC(12,2)  NOT NULL DEFAULT 0,
    total             NUMERIC(12,2)  NOT NULL DEFAULT 0,
    amount_paid       NUMERIC(12,2)  NOT NULL DEFAULT 0,
    balance           NUMERIC(12,2)  NOT NULL DEFAULT 0,
    status            TEXT           NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending','partial','received','cancelled')),
    payment_status    TEXT           NOT NULL DEFAULT 'pending'
                                     CHECK (payment_status IN ('pending','partial','paid')),
    notes             TEXT,
    created_by        BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id   ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status        ON purchases(status);

CREATE TABLE IF NOT EXISTS purchase_items (
    id           BIGSERIAL      PRIMARY KEY,
    purchase_id  BIGINT         NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id   BIGINT         REFERENCES products(id) ON DELETE SET NULL,
    lens_id      BIGINT         REFERENCES lenses(id) ON DELETE SET NULL,
    quantity     INTEGER        NOT NULL DEFAULT 1,
    unit_cost    NUMERIC(12,2)  NOT NULL DEFAULT 0,
    total        NUMERIC(12,2)  NOT NULL DEFAULT 0,
    received_qty INTEGER        NOT NULL DEFAULT 0,
    notes        TEXT,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
