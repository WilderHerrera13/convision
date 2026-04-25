-- 000011: Create follow_ups table — records patient evolution captured during
-- a follow-up clinical visit linked to an existing clinical record.

CREATE TABLE IF NOT EXISTS follow_ups (
    id                      BIGSERIAL    PRIMARY KEY,
    clinic_id               INTEGER      NOT NULL REFERENCES clinics(id),
    clinical_record_id      BIGINT       NOT NULL REFERENCES clinical_records(id),
    control_reason          TEXT         NULL,
    correction_satisfaction VARCHAR(50)  NULL,
    subjective_changes      TEXT         NULL,
    medications             TEXT         NULL,
    systemic_changes        TEXT         NULL,
    correction_use          VARCHAR(50)  NULL,
    -- daily_hours: average hours per day the patient wears their correction.
    daily_hours             INTEGER      NULL,
    observations            TEXT         NULL,
    evolution_type          VARCHAR(20)  NOT NULL CHECK (evolution_type IN ('stable', 'improved', 'worsened')),
    evolution_description   TEXT         NULL,
    new_diagnosis           BOOLEAN      NOT NULL DEFAULT FALSE,
    continuity_plan         TEXT         NULL,
    formula_decision        VARCHAR(20)  NOT NULL CHECK (formula_decision IN ('maintain', 'update')),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger to keep updated_at current.
CREATE TRIGGER set_updated_at_follow_ups
    BEFORE UPDATE ON follow_ups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_follow_ups_clinic_id
    ON follow_ups (clinic_id);

CREATE INDEX IF NOT EXISTS idx_follow_ups_clinical_record_id
    ON follow_ups (clinical_record_id);
