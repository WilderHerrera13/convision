DROP INDEX IF EXISTS uq_cash_register_closes_user_branch_date_active;

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_cash_register_closes_user_date_active
ON cash_register_closes (user_id, ((close_date AT TIME ZONE 'UTC')::date))
WHERE status IN ('submitted', 'approved');
