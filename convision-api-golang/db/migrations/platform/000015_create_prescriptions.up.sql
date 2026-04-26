CREATE TABLE IF NOT EXISTS prescriptions (
    id                  BIGSERIAL     PRIMARY KEY,
    clinic_id           INTEGER       NOT NULL REFERENCES clinics(id),
    clinical_record_id  BIGINT        NOT NULL UNIQUE REFERENCES clinical_records(id),

    sph_od              NUMERIC(10,4) NULL,
    cyl_od              NUMERIC(10,4) NULL,
    axis_od             INTEGER       NULL,
    avcc_od             VARCHAR(20)   NULL,
    add_od              NUMERIC(10,4) NULL,
    dp_od               NUMERIC(6,2)  NULL,

    sph_oi              NUMERIC(10,4) NULL,
    cyl_oi              NUMERIC(10,4) NULL,
    axis_oi             INTEGER       NULL,
    avcc_oi             VARCHAR(20)   NULL,
    add_oi              NUMERIC(10,4) NULL,
    dp_oi               NUMERIC(6,2)  NULL,

    lens_type           VARCHAR(50)   NULL,
    lens_material       VARCHAR(50)   NULL,
    lens_use            VARCHAR(50)   NULL,
    mounting_height     NUMERIC(6,2)  NULL,
    treatments          JSONB         NULL,
    validity_months     SMALLINT      NOT NULL DEFAULT 12,

    professional_tp     VARCHAR(50)   NULL,
    signed_at           TIMESTAMPTZ   NULL,

    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic_id          ON prescriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_clinical_record_id ON prescriptions(clinical_record_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_treatments         ON prescriptions USING GIN (treatments);

CREATE TRIGGER set_updated_at_prescriptions
    BEFORE UPDATE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
