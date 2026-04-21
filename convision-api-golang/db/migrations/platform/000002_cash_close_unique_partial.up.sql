-- QA-CC-102: prevent more than one submitted/approved close per (user_id, close_date).
-- A partial unique index covers only non-draft statuses; multiple drafts can coexist during
-- transition but the application-level UPSERT logic ensures only one draft is ever active.
CREATE UNIQUE INDEX IF NOT EXISTS
    uq_cash_register_closes_user_date_active
ON cash_register_closes (user_id, DATE(close_date))
WHERE status IN ('submitted', 'approved');
