-- 000014: Create diagnoses table — stores structured ICD-10 (CIE-10) diagnosis,
-- related diagnoses, and care plan for a clinical record (new_consultation flow).

CREATE TABLE IF NOT EXISTS diagnoses (
    id                      BIGSERIAL    PRIMARY KEY,
    clinic_id               INTEGER      NOT NULL REFERENCES clinics(id),
    clinical_record_id      BIGINT       NOT NULL UNIQUE REFERENCES clinical_records(id),

    primary_code            VARCHAR(20)  NOT NULL,
    primary_description     TEXT         NOT NULL,
    diagnosis_type          SMALLINT     NOT NULL DEFAULT 1 CHECK (diagnosis_type IN (1,2,3)),

    related_1_code          VARCHAR(20)  NULL,
    related_1_desc          TEXT         NULL,
    related_2_code          VARCHAR(20)  NULL,
    related_2_desc          TEXT         NULL,
    related_3_code          VARCHAR(20)  NULL,
    related_3_desc          TEXT         NULL,

    optical_correction_plan VARCHAR(50)  NULL,
    patient_education       TEXT         NULL,
    next_control_date       TIMESTAMPTZ  NULL,
    next_control_reason     VARCHAR(50)  NULL,
    requires_referral       BOOLEAN      NOT NULL DEFAULT FALSE,
    referral_notes          TEXT         NULL,
    cups                    VARCHAR(20)  NULL,

    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_clinic_id          ON diagnoses(clinic_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_clinical_record_id ON diagnoses(clinical_record_id);

CREATE TRIGGER set_updated_at_diagnoses
    BEFORE UPDATE ON diagnoses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
