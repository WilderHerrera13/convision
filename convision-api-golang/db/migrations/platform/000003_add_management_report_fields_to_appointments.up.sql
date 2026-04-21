ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS consultation_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS report_notes       TEXT;

ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS appointments_consultation_type_check;
ALTER TABLE appointments
    ADD CONSTRAINT appointments_consultation_type_check
    CHECK (
        consultation_type IS NULL
        OR consultation_type IN (
            'effective',
            'formula_sale',
            'ineffective',
            'follow_up',
            'warranty_follow_up'
        )
    );

CREATE INDEX IF NOT EXISTS idx_appointments_consultation_type
    ON appointments (consultation_type)
    WHERE consultation_type IS NOT NULL;
