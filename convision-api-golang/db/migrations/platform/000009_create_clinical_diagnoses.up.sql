-- 000009: Create clinical_diagnoses table — stores ICD-10 (CIE-10) diagnostic
-- codes and care plan for a clinical record.

CREATE TABLE IF NOT EXISTS clinical_diagnoses (
    id                  BIGSERIAL    PRIMARY KEY,
    clinic_id           INTEGER      NOT NULL REFERENCES clinics(id),
    clinical_record_id  BIGINT       NOT NULL REFERENCES clinical_records(id),
    primary_cie10_code  VARCHAR(20)  NULL,
    primary_description TEXT         NULL,
    diagnosis_type      VARCHAR(20)  NOT NULL CHECK (diagnosis_type IN ('main', 'related')),
    -- related_codes is a JSON array of additional CIE-10 codes.
    related_codes       JSONB        NULL,
    care_plan           TEXT         NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger to keep updated_at current.
CREATE TRIGGER set_updated_at_clinical_diagnoses
    BEFORE UPDATE ON clinical_diagnoses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- GIN index for JSONB column queries.
CREATE INDEX IF NOT EXISTS idx_clinical_diagnoses_related_codes
    ON clinical_diagnoses USING GIN (related_codes);

CREATE INDEX IF NOT EXISTS idx_clinical_diagnoses_clinic_id
    ON clinical_diagnoses (clinic_id);

CREATE INDEX IF NOT EXISTS idx_clinical_diagnoses_clinical_record_id
    ON clinical_diagnoses (clinical_record_id);
