-- 000007: Create anamneses table — stores patient history and chief complaint
-- for a clinical record.

CREATE TABLE IF NOT EXISTS anamneses (
    id                    BIGSERIAL    PRIMARY KEY,
    clinic_id             INTEGER      NOT NULL REFERENCES clinics(id),
    clinical_record_id    BIGINT       NOT NULL REFERENCES clinical_records(id),
    chief_complaint       TEXT         NULL,
    ocular_history        TEXT         NULL,
    family_history        TEXT         NULL,
    systemic_history      TEXT         NULL,
    current_correction_od VARCHAR(100) NULL,
    current_correction_oi VARCHAR(100) NULL,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger to keep updated_at current.
CREATE TRIGGER set_updated_at_anamneses
    BEFORE UPDATE ON anamneses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Partial index for fast lookup by clinical record.
CREATE INDEX IF NOT EXISTS idx_anamneses_clinic_id
    ON anamneses (clinic_id);

CREATE INDEX IF NOT EXISTS idx_anamneses_clinical_record_id
    ON anamneses (clinical_record_id);
