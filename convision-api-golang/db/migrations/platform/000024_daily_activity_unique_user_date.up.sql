-- QA-002: prevent duplicate daily activity reports for the same user on the same Bogotá calendar day.
-- Remove any existing duplicates first (keep highest ID per user+local_date pair),
-- then enforce the constraint via a unique expression index.
DELETE FROM optica_main.daily_activity_reports
WHERE id NOT IN (
    SELECT MAX(id)
    FROM optica_main.daily_activity_reports
    GROUP BY user_id, DATE(report_date AT TIME ZONE 'America/Bogota')
);

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_daily_activity_reports_user_date
ON optica_main.daily_activity_reports (user_id, (DATE(report_date AT TIME ZONE 'America/Bogota')));
