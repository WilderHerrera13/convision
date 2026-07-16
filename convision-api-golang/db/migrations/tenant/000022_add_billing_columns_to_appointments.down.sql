-- Reversion for 000022_add_billing_columns_to_appointments.

DROP INDEX IF EXISTS idx_appointments_sale_id;
DROP INDEX IF EXISTS idx_appointments_sales_queue;

ALTER TABLE appointments
    DROP COLUMN IF EXISTS sale_id,
    DROP COLUMN IF EXISTS billed_at,
    DROP COLUMN IF EXISTS is_billed;
