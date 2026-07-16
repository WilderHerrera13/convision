-- Sale.Delete() previously issued a hard DELETE, silently losing the sale row
-- (and its FK-cascaded items/payments/adjustments) with no revert-stock or NC
-- emission safety net, unlike Cancel(). Adding deleted_at makes GORM's
-- gorm.DeletedAt convention soft-delete the row instead — the service layer
-- now runs the same protective logic as Cancel() before deleting.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON sales(deleted_at);
