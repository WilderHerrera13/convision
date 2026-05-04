CREATE TABLE IF NOT EXISTS daily_report_edit_logs (
    id                       BIGSERIAL PRIMARY KEY,
    daily_activity_report_id BIGINT       NOT NULL REFERENCES daily_activity_reports(id) ON DELETE CASCADE,
    action                   VARCHAR(30)  NOT NULL CHECK (action IN ('created', 'updated', 'closed', 'reopened')),
    performed_by_user_id     BIGINT       NOT NULL REFERENCES users(id),
    performed_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_report_edit_logs_report_id
    ON daily_report_edit_logs (daily_activity_report_id);
