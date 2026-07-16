ALTER TABLE sales
    DROP COLUMN IF EXISTS credit_note_id,
    DROP COLUMN IF EXISTS credit_note_status;

ALTER TABLE sale_lens_price_adjustments
    DROP COLUMN IF EXISTS debit_note_id,
    DROP COLUMN IF EXISTS debit_note_status;
