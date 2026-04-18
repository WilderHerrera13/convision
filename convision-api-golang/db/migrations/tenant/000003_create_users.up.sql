-- Tenant migration 003: System users (operators of the tenant account)

CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL    PRIMARY KEY,
    name           TEXT         NOT NULL,
    last_name      TEXT         NOT NULL DEFAULT '',
    email          TEXT         NOT NULL UNIQUE,
    identification TEXT,
    phone          TEXT,
    password_hash  TEXT         NOT NULL,
    role           TEXT         NOT NULL DEFAULT 'receptionist'
                                CHECK (role IN ('admin','specialist','receptionist','laboratory')),
    is_active      BOOLEAN      NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
