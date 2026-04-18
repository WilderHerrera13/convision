-- Tenant migration 011: Sales, payments and partial payments

CREATE TABLE IF NOT EXISTS sales (
    id             BIGSERIAL      PRIMARY KEY,
    sale_number    TEXT           NOT NULL UNIQUE,
    order_id       BIGINT,        -- FK added in orders migration
    patient_id     BIGINT         NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    appointment_id BIGINT         REFERENCES appointments(id) ON DELETE SET NULL,
    clinic_id      BIGINT         REFERENCES clinics(id) ON DELETE SET NULL,
    subtotal       NUMERIC(12,2)  NOT NULL DEFAULT 0,
    tax            NUMERIC(12,2)  NOT NULL DEFAULT 0,
    discount       NUMERIC(12,2)  NOT NULL DEFAULT 0,
    total          NUMERIC(12,2)  NOT NULL DEFAULT 0,
    amount_paid    NUMERIC(12,2)  NOT NULL DEFAULT 0,
    balance        NUMERIC(12,2)  NOT NULL DEFAULT 0,
    status         TEXT           NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','completed','cancelled','refunded')),
    payment_status TEXT           NOT NULL DEFAULT 'pending'
                                  CHECK (payment_status IN ('pending','partial','paid','refunded')),
    notes          TEXT,
    created_by     BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_patient_id    ON sales(patient_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_number   ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_status        ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at    ON sales(created_at DESC);

CREATE TABLE IF NOT EXISTS sale_items (
    id         BIGSERIAL      PRIMARY KEY,
    sale_id    BIGINT         NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    lens_id    BIGINT         REFERENCES lenses(id) ON DELETE SET NULL,
    product_id BIGINT         REFERENCES products(id) ON DELETE SET NULL,
    quantity   INTEGER        NOT NULL DEFAULT 1,
    price      NUMERIC(12,2)  NOT NULL DEFAULT 0,
    discount   NUMERIC(12,2)  NOT NULL DEFAULT 0,
    total      NUMERIC(12,2)  NOT NULL DEFAULT 0,
    notes      TEXT,
    created_at TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

CREATE TABLE IF NOT EXISTS sale_payments (
    id                BIGSERIAL      PRIMARY KEY,
    sale_id           BIGINT         NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method_id BIGINT         REFERENCES payment_methods(id) ON DELETE SET NULL,
    amount            NUMERIC(12,2)  NOT NULL,
    reference_number  TEXT,
    notes             TEXT,
    payment_date      TIMESTAMPTZ,
    created_by        BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);

CREATE TABLE IF NOT EXISTS partial_payments (
    id                BIGSERIAL      PRIMARY KEY,
    sale_id           BIGINT         NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method_id BIGINT         REFERENCES payment_methods(id) ON DELETE SET NULL,
    amount            NUMERIC(12,2)  NOT NULL,
    reference_number  TEXT,
    payment_date      TIMESTAMPTZ,
    notes             TEXT,
    created_by        BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partial_payments_sale_id ON partial_payments(sale_id);

CREATE TABLE IF NOT EXISTS sale_lens_price_adjustments (
    id                BIGSERIAL      PRIMARY KEY,
    sale_id           BIGINT         NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    lens_id           BIGINT         REFERENCES lenses(id) ON DELETE SET NULL,
    base_price        NUMERIC(12,2)  NOT NULL DEFAULT 0,
    adjusted_price    NUMERIC(12,2)  NOT NULL DEFAULT 0,
    adjustment_amount NUMERIC(12,2)  NOT NULL DEFAULT 0,
    reason            TEXT,
    adjusted_by       BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sale_lens_adj_sale_id ON sale_lens_price_adjustments(sale_id);
