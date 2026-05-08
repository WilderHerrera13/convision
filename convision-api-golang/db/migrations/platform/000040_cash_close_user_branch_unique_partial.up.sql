-- QA-CCA-V2-001 / QA-CCA-V2-002: replace the (user_id, close_date::date) partial unique
-- index with a (user_id, branch_id, close_date::date) partial unique index. An advisor that
-- works in two branches the same day must be able to close cash for each branch separately.
--
-- This migration also remediates pre-existing duplicates in submitted/approved status by
-- demoting all but the "winning" close to draft. The winner per (user_id, branch_id, date)
-- is selected as: approved > submitted, then most recent created_at.

WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, branch_id, ((close_date AT TIME ZONE 'UTC')::date)
            ORDER BY
                CASE status
                    WHEN 'approved'  THEN 1
                    WHEN 'submitted' THEN 2
                    ELSE                  3
                END,
                created_at DESC
        ) AS rn
    FROM cash_register_closes
    WHERE status IN ('submitted', 'approved')
      AND close_date IS NOT NULL
)
UPDATE cash_register_closes
SET status = 'draft', updated_at = NOW()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

DROP INDEX IF EXISTS uq_cash_register_closes_user_date_active;

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_cash_register_closes_user_branch_date_active
ON cash_register_closes (user_id, branch_id, ((close_date AT TIME ZONE 'UTC')::date))
WHERE status IN ('submitted', 'approved');
