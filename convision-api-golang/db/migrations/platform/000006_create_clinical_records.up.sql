CREATE TABLE IF NOT EXISTS clinical_records (
    id             BIGSERIAL PRIMARY KEY,
    branch_id      INTEGER      NOT NULL,
    appointment_id BIGINT       NOT NULL REFERENCES appointments(id),
    patient_id     BIGINT       NOT NULL REFERENCES patients(id),
    specialist_id  BIGINT       NOT NULL REFERENCES users(id),
    record_type    VARCHAR(30)  NOT NULL CHECK (record_type IN ('new_consultation', 'follow_up')),
    status         VARCHAR(20)  NOT NULL DEFAULT 'in_progress',
    cups           VARCHAR(20),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ  NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_updated_at_clinical_records'
          AND tgrelid = 'clinical_records'::regclass
    ) THEN
        CREATE TRIGGER set_updated_at_clinical_records
            BEFORE UPDATE ON clinical_records
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_clinical_records_branch_id
    ON clinical_records (branch_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinical_records_appointment_id
    ON clinical_records (appointment_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinical_records_patient_id
    ON clinical_records (patient_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinical_records_specialist_id
    ON clinical_records (specialist_id) WHERE deleted_at IS NULL;
