-- Tenant migration 010: Lens catalog
-- Each tenant manages their own lens catalog (no shared catalog).

CREATE TABLE IF NOT EXISTS lens_types (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lens_classes (
    id          BIGSERIAL   PRIMARY KEY,
    name        TEXT        NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lens_materials (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lens_treatments (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lens_photochromics (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lens_brands (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lenses (
    id              BIGSERIAL      PRIMARY KEY,
    internal_code   TEXT,
    identifier      TEXT,
    type_id         BIGINT         REFERENCES lens_types(id) ON DELETE SET NULL,
    brand_id        BIGINT         REFERENCES lens_brands(id) ON DELETE SET NULL,
    material_id     BIGINT         REFERENCES lens_materials(id) ON DELETE SET NULL,
    lens_class_id   BIGINT         REFERENCES lens_classes(id) ON DELETE SET NULL,
    treatment_id    BIGINT         REFERENCES lens_treatments(id) ON DELETE SET NULL,
    photochromic_id BIGINT         REFERENCES lens_photochromics(id) ON DELETE SET NULL,
    supplier_id     BIGINT         REFERENCES suppliers(id) ON DELETE SET NULL,
    description     TEXT,
    price           NUMERIC(12,2)  NOT NULL DEFAULT 0,
    cost            NUMERIC(12,2)  NOT NULL DEFAULT 0,
    sphere_min      NUMERIC(5,2),
    sphere_max      NUMERIC(5,2),
    cylinder_min    NUMERIC(5,2),
    cylinder_max    NUMERIC(5,2),
    addition_min    NUMERIC(5,2),
    addition_max    NUMERIC(5,2),
    has_discounts   BOOLEAN        NOT NULL DEFAULT false,
    status          TEXT           NOT NULL DEFAULT 'enabled'
                                   CHECK (status IN ('enabled','disabled')),
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lenses_internal_code ON lenses(internal_code);
CREATE INDEX IF NOT EXISTS idx_lenses_status        ON lenses(status);

-- Products (frames, accessories, etc.)
CREATE TABLE IF NOT EXISTS product_categories (
    id          BIGSERIAL   PRIMARY KEY,
    name        TEXT        NOT NULL,
    description TEXT,
    parent_id   BIGINT      REFERENCES product_categories(id) ON DELETE SET NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_brands (
    id         BIGSERIAL   PRIMARY KEY,
    name       TEXT        NOT NULL,
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    id                  BIGSERIAL      PRIMARY KEY,
    name                TEXT           NOT NULL,
    internal_code       TEXT,
    barcode             TEXT,
    description         TEXT,
    category_id         BIGINT         REFERENCES product_categories(id) ON DELETE SET NULL,
    brand_id            BIGINT         REFERENCES product_brands(id) ON DELETE SET NULL,
    supplier_id         BIGINT         REFERENCES suppliers(id) ON DELETE SET NULL,
    price               NUMERIC(12,2)  NOT NULL DEFAULT 0,
    cost                NUMERIC(12,2)  NOT NULL DEFAULT 0,
    stock               INTEGER        NOT NULL DEFAULT 0,
    min_stock           INTEGER        NOT NULL DEFAULT 0,
    unit                TEXT           NOT NULL DEFAULT 'unit',
    is_active           BOOLEAN        NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_internal_code ON products(internal_code);
CREATE INDEX IF NOT EXISTS idx_products_category_id   ON products(category_id);
