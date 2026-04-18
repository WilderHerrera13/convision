-- Tenant migration 004: Clinics (branches within the tenant account)

CREATE TABLE IF NOT EXISTS clinics (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    address    TEXT,
    phone      TEXT,
    email      TEXT,
    city_id    BIGINT      REFERENCES cities(id) ON DELETE SET NULL,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clinics_city_id ON clinics(city_id);
