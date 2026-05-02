CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS clinical_records (
    id             BIGSERIAL PRIMARY KEY,
    clinic_id      INTEGER      NOT NULL REFERENCES clinics(id),
    appointment_id BIGINT       NOT NULL REFERENCES appointments(id),
    patient_id     BIGINT       NOT NULL REFERENCES patients(id),
    specialist_id  BIGINT       NOT NULL REFERENCES users(id),
    record_type    VARCHAR(30)  NOT NULL CHECK (record_type IN ('new_consultation', 'follow_up')),
    status         VARCHAR(20)  NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed')),
    signed_at      TIMESTAMPTZ  NULL,
    signed_by_id   BIGINT       NULL REFERENCES users(id),
    legal_text     TEXT         NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ  NULL
);

-- Trigger to keep updated_at current.
CREATE TRIGGER set_updated_at_clinical_records
    BEFORE UPDATE ON clinical_records
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Partial indexes for fast lookups on non-deleted rows.
CREATE INDEX IF NOT EXISTS idx_clinical_records_clinic_id
    ON clinical_records (clinic_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinical_records_appointment_id
    ON clinical_records (appointment_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinical_records_patient_id
    ON clinical_records (patient_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinical_records_specialist_id
    ON clinical_records (specialist_id) WHERE deleted_at IS NULL;
