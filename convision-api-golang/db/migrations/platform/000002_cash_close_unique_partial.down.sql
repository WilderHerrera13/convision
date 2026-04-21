-- Rollback: remove the partial unique index added in 000002_cash_close_unique_partial.up.sql
DROP INDEX IF EXISTS uq_cash_register_closes_user_date_active;
