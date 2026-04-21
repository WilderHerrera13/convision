DROP INDEX IF EXISTS idx_appointments_consultation_type;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_consultation_type_check;
ALTER TABLE appointments DROP COLUMN IF EXISTS report_notes;
ALTER TABLE appointments DROP COLUMN IF EXISTS consultation_type;
