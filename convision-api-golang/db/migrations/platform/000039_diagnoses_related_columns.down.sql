-- 000039 rollback: drop the related_*_code/desc columns from diagnoses.

ALTER TABLE diagnoses
    DROP COLUMN IF EXISTS related_1_code,
    DROP COLUMN IF EXISTS related_1_desc,
    DROP COLUMN IF EXISTS related_2_code,
    DROP COLUMN IF EXISTS related_2_desc,
    DROP COLUMN IF EXISTS related_3_code,
    DROP COLUMN IF EXISTS related_3_desc;
