-- Tenant migration 006: Appointments

CREATE TABLE IF NOT EXISTS appointments (
    id               BIGSERIAL    PRIMARY KEY,
    patient_id       BIGINT       NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id        BIGINT       REFERENCES clinics(id) ON DELETE SET NULL,
    specialist_id    BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    scheduled_at     TIMESTAMPTZ  NOT NULL,
    duration_minutes INTEGER      NOT NULL DEFAULT 30,
    reason           TEXT,
    notes            TEXT,
    status           TEXT         NOT NULL DEFAULT 'scheduled'
                                  CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
    cancelled_reason TEXT,
    created_by       BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id    ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_specialist_id ON appointments(specialist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id     ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at  ON appointments(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_status        ON appointments(status);
