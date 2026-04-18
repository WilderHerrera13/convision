-- Tenant migration 002: Geographic location hierarchy

CREATE TABLE IF NOT EXISTS countries (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    code       TEXT        NOT NULL UNIQUE,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
    id         BIGSERIAL   PRIMARY KEY,
    country_id BIGINT      NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    name       TEXT        NOT NULL,
    code       TEXT,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_departments_country_id ON departments(country_id);

CREATE TABLE IF NOT EXISTS cities (
    id            BIGSERIAL   PRIMARY KEY,
    department_id BIGINT      NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    name          TEXT        NOT NULL,
    code          TEXT,
    is_active     BOOLEAN     NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cities_department_id ON cities(department_id);

CREATE TABLE IF NOT EXISTS districts (
    id         BIGSERIAL   PRIMARY KEY,
    city_id    BIGINT      NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    name       TEXT        NOT NULL,
    code       TEXT,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_districts_city_id ON districts(city_id);
