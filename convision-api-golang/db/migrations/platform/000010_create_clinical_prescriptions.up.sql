-- 000010: Create clinical_prescriptions table — stores the optical formula
-- prescribed at the end of a clinical encounter.

CREATE TABLE IF NOT EXISTS clinical_prescriptions (
    id                  BIGSERIAL     PRIMARY KEY,
    clinic_id           INTEGER       NOT NULL REFERENCES clinics(id),
    clinical_record_id  BIGINT        NOT NULL REFERENCES clinical_records(id),

    -- Right eye (OD = oculus dexter)
    sphere_od           NUMERIC(10,4) NULL,
    cylinder_od         NUMERIC(10,4) NULL,
    axis_od             INTEGER       NULL,
    add_od              NUMERIC(10,4) NULL,

    -- Left eye (OI = oculus sinister)
    sphere_oi           NUMERIC(10,4) NULL,
    cylinder_oi         NUMERIC(10,4) NULL,
    axis_oi             INTEGER       NULL,
    add_oi              NUMERIC(10,4) NULL,

    -- Lens specifications
    lens_type           VARCHAR(50)   NULL,
    lens_material       VARCHAR(50)   NULL,
    lens_use            VARCHAR(50)   NULL,
    -- treatments is a JSON array of applied lens treatments.
    treatments          JSONB         NULL,

    valid_until         DATE          NULL,
    -- cups_code is the Colombian health service billing code.
    cups_code           VARCHAR(20)   NULL,

    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Trigger to keep updated_at current.
CREATE TRIGGER set_updated_at_clinical_prescriptions
    BEFORE UPDATE ON clinical_prescriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- GIN index for JSONB column queries.
CREATE INDEX IF NOT EXISTS idx_clinical_prescriptions_treatments
    ON clinical_prescriptions USING GIN (treatments);

CREATE INDEX IF NOT EXISTS idx_clinical_prescriptions_clinic_id
    ON clinical_prescriptions (clinic_id);

CREATE INDEX IF NOT EXISTS idx_clinical_prescriptions_clinical_record_id
    ON clinical_prescriptions (clinical_record_id);
