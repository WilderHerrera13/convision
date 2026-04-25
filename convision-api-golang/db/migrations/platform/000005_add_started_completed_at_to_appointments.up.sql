-- 000005: Add started_at and completed_at columns to appointments for tracking
-- in-progress clinical encounters.

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS started_at   TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;
