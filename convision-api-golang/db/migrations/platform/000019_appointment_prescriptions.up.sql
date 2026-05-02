CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS appointment_prescriptions (
    id                      BIGSERIAL     PRIMARY KEY,
    appointment_id          BIGINT        NULL,
    date                    TIMESTAMPTZ   NULL,
    document                TEXT          NULL,
    patient_name            VARCHAR(255)  NULL,
    right_sphere            VARCHAR(50)   NULL,
    right_cylinder          VARCHAR(50)   NULL,
    right_axis              VARCHAR(50)   NULL,
    right_addition          VARCHAR(50)   NULL,
    right_height            VARCHAR(50)   NULL,
    right_distance_p        VARCHAR(50)   NULL,
    right_visual_acuity_far VARCHAR(50)   NULL,
    right_visual_acuity_near VARCHAR(50)  NULL,
    left_sphere             VARCHAR(50)   NULL,
    left_cylinder           VARCHAR(50)   NULL,
    left_axis               VARCHAR(50)   NULL,
    left_addition           VARCHAR(50)   NULL,
    left_height             VARCHAR(50)   NULL,
    left_distance_p         VARCHAR(50)   NULL,
    left_visual_acuity_far  VARCHAR(50)   NULL,
    left_visual_acuity_near VARCHAR(50)   NULL,
    correction_type         VARCHAR(50)   NULL,
    usage_type              VARCHAR(50)   NULL,
    recommendation          TEXT          NULL,
    professional            VARCHAR(255)  NULL,
    observation             TEXT          NULL,
    attachment              TEXT          NULL,
    annotation_paths        TEXT          NULL,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_prescriptions_appointment_id
    ON appointment_prescriptions(appointment_id);

DROP TRIGGER IF EXISTS set_updated_at_appointment_prescriptions ON appointment_prescriptions;
CREATE TRIGGER set_updated_at_appointment_prescriptions
    BEFORE UPDATE ON appointment_prescriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
