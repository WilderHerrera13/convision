-- 000039: Backfill missing related_*_code/desc columns on diagnoses for
-- environments where the table was created before 000014 was amended to
-- include them. Idempotent so it's safe to apply on every environment.

ALTER TABLE diagnoses
    ADD COLUMN IF NOT EXISTS related_1_code VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS related_1_desc TEXT        NULL,
    ADD COLUMN IF NOT EXISTS related_2_code VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS related_2_desc TEXT        NULL,
    ADD COLUMN IF NOT EXISTS related_3_code VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS related_3_desc TEXT        NULL;
