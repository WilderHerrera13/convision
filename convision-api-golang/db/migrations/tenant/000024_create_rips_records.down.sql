-- Reversion for 000024_create_rips_records.

DROP INDEX IF EXISTS idx_rips_records_patient_id;
DROP INDEX IF EXISTS idx_rips_records_status;
DROP TABLE IF EXISTS rips_records;
