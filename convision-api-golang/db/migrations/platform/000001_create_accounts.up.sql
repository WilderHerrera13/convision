-- Platform schema: accounts
-- This schema is owned by the platform operator (super admin).
-- Tenants NEVER have access to this schema.

CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.accounts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT        NOT NULL UNIQUE,         -- used as schema name: "tenant_" || slug
    name        TEXT        NOT NULL,
    plan        TEXT        NOT NULL DEFAULT 'basic', -- basic | professional | enterprise
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  platform.accounts           IS 'One row per paying customer (account). Each account owns a schema named tenant_{slug}.';
COMMENT ON COLUMN platform.accounts.slug      IS 'URL-safe identifier. Also used to derive the tenant PostgreSQL schema name.';
COMMENT ON COLUMN platform.accounts.is_active IS 'Set to false to suspend a tenant without deleting data.';

CREATE INDEX IF NOT EXISTS idx_accounts_slug      ON platform.accounts (slug);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON platform.accounts (is_active);
