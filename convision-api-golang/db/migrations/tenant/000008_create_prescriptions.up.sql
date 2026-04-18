-- Tenant migration 008: Optical prescriptions

CREATE TABLE IF NOT EXISTS prescriptions (
    id                          BIGSERIAL    PRIMARY KEY,
    patient_id                  BIGINT       NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinical_history_id         BIGINT       REFERENCES clinical_histories(id) ON DELETE SET NULL,
    appointment_id              BIGINT       REFERENCES appointments(id) ON DELETE SET NULL,
    prescribed_by               BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    prescription_date           DATE         NOT NULL DEFAULT CURRENT_DATE,
    -- Right eye (OD)
    od_sphere                   NUMERIC(5,2),
    od_cylinder                 NUMERIC(5,2),
    od_axis                     INTEGER,
    od_addition                 NUMERIC(5,2),
    od_prism                    TEXT,
    od_visual_acuity            TEXT,
    -- Left eye (OS)
    os_sphere                   NUMERIC(5,2),
    os_cylinder                 NUMERIC(5,2),
    os_axis                     INTEGER,
    os_addition                 NUMERIC(5,2),
    os_prism                    TEXT,
    os_visual_acuity            TEXT,
    -- Extras
    pupillary_distance          NUMERIC(5,2),
    near_pupillary_distance     NUMERIC(5,2),
    lens_type                   TEXT,
    notes                       TEXT,
    is_active                   BOOLEAN      NOT NULL DEFAULT true,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date       ON prescriptions(prescription_date DESC);
