-- Tenant migration 001: Lookup tables
-- All configurable reference data owned by the tenant.
-- search_path must be set to the tenant schema before running this file.

-- Identification document types (e.g. CC, NIT, CE, Passport)
CREATE TABLE IF NOT EXISTS identification_types (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    code       TEXT        NOT NULL UNIQUE,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Health affiliation types (e.g. contributivo, subsidiado)
CREATE TABLE IF NOT EXISTS affiliation_types (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    code       TEXT        NOT NULL UNIQUE,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Health coverage types
CREATE TABLE IF NOT EXISTS coverage_types (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    code       TEXT        NOT NULL UNIQUE,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Health insurance providers / EPS
CREATE TABLE IF NOT EXISTS health_insurance_providers (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    code       TEXT        NOT NULL UNIQUE,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Education levels
CREATE TABLE IF NOT EXISTS education_levels (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    code       TEXT        NOT NULL UNIQUE,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment methods accepted by the tenant (cash, card, transfer, etc.)
CREATE TABLE IF NOT EXISTS payment_methods (
    id                BIGSERIAL   PRIMARY KEY,
    name              TEXT        NOT NULL,
    code              TEXT        NOT NULL UNIQUE,
    description       TEXT,
    requires_reference BOOLEAN    NOT NULL DEFAULT false,
    is_active         BOOLEAN     NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
