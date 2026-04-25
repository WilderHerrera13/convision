-- 000005 rollback: Remove started_at and completed_at from appointments.

ALTER TABLE appointments
    DROP COLUMN IF EXISTS started_at,
    DROP COLUMN IF EXISTS completed_at;
