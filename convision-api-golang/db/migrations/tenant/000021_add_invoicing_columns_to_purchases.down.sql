ALTER TABLE purchases
    DROP COLUMN IF EXISTS invoicing_id,
    DROP COLUMN IF EXISTS invoicing_status;
