-- Reversion for 000023_create_icd10_codes.

DROP INDEX IF EXISTS idx_icd10_codes_description_trgm;
DROP INDEX IF EXISTS idx_icd10_codes_active;
DROP INDEX IF EXISTS uq_icd10_codes_code;
DROP TABLE IF EXISTS icd10_codes;
