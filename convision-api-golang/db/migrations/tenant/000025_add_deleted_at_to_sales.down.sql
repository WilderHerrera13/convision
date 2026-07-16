DROP INDEX IF EXISTS idx_sales_deleted_at;
ALTER TABLE sales DROP COLUMN IF EXISTS deleted_at;
