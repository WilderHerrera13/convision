-- Tenant migration 005: Patients

CREATE TABLE IF NOT EXISTS patients (
    id                     BIGSERIAL   PRIMARY KEY,
    first_name             TEXT        NOT NULL,
    last_name              TEXT        NOT NULL,
    email                  TEXT,
    phone                  TEXT,
    identification         TEXT,
    identification_type_id BIGINT      REFERENCES identification_types(id) ON DELETE SET NULL,
    birth_date             DATE,
    gender                 TEXT        CHECK (gender IN ('male','female','other')),
    address                TEXT,
    neighborhood           TEXT,
    postal_code            TEXT,
    country_id             BIGINT      REFERENCES countries(id) ON DELETE SET NULL,
    department_id          BIGINT      REFERENCES departments(id) ON DELETE SET NULL,
    city_id                BIGINT      REFERENCES cities(id) ON DELETE SET NULL,
    district_id            BIGINT      REFERENCES districts(id) ON DELETE SET NULL,
    health_insurance_id    BIGINT      REFERENCES health_insurance_providers(id) ON DELETE SET NULL,
    affiliation_type_id    BIGINT      REFERENCES affiliation_types(id) ON DELETE SET NULL,
    coverage_type_id       BIGINT      REFERENCES coverage_types(id) ON DELETE SET NULL,
    education_level_id     BIGINT      REFERENCES education_levels(id) ON DELETE SET NULL,
    occupation             TEXT,
    position               TEXT,
    company                TEXT,
    notes                  TEXT,
    status                 TEXT        NOT NULL DEFAULT 'active'
                                       CHECK (status IN ('active','inactive','archived')),
    profile_image          TEXT,
    clinic_id              BIGINT      REFERENCES clinics(id) ON DELETE SET NULL,
    created_by             BIGINT      REFERENCES users(id) ON DELETE SET NULL,
    deleted_at             TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_identification ON patients(identification);
CREATE INDEX IF NOT EXISTS idx_patients_email          ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id      ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_status         ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_deleted_at     ON patients(deleted_at) WHERE deleted_at IS NULL;
