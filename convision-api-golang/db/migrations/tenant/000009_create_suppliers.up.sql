-- Tenant migration 009: Suppliers

CREATE TABLE IF NOT EXISTS suppliers (
    id             BIGSERIAL   PRIMARY KEY,
    name           TEXT        NOT NULL,
    trade_name     TEXT,
    tax_id         TEXT,
    email          TEXT,
    phone          TEXT,
    address        TEXT,
    city_id        BIGINT      REFERENCES cities(id) ON DELETE SET NULL,
    contact_name   TEXT,
    contact_phone  TEXT,
    contact_email  TEXT,
    notes          TEXT,
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
