DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'convision_app') THEN
    EXECUTE 'GRANT CREATE ON DATABASE convision TO convision_app';
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.opticas (
    id            SERIAL PRIMARY KEY,
    slug          VARCHAR(60)  NOT NULL UNIQUE,
    name          VARCHAR(150) NOT NULL,
    plan          VARCHAR(30)  NOT NULL DEFAULT 'standard'
                  CHECK (plan IN ('standard', 'premium', 'enterprise')),
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    schema_name   VARCHAR(70)  NOT NULL UNIQUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_opticas_slug ON platform.opticas (slug) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS platform.super_admins (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform.optica_features (
    id          SERIAL PRIMARY KEY,
    optica_id   INTEGER      NOT NULL REFERENCES platform.opticas(id) ON DELETE CASCADE,
    feature_key VARCHAR(80)  NOT NULL,
    is_enabled  BOOLEAN      NOT NULL DEFAULT true,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (optica_id, feature_key)
);
CREATE INDEX IF NOT EXISTS idx_optica_features_optica_id ON platform.optica_features (optica_id);
