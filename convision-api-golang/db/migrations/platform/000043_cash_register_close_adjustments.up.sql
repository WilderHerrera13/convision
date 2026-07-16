-- ============================================================================
-- Cash register close — admin adjustment / versioning + warning ledger
--   Each row records one admin adjustment of a submitted close: the before
--   (advisor-reported) and after (admin-corrected) JSONB snapshots for
--   comparison, plus advisor_user_id so warnings can be counted per advisor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS cash_register_close_adjustments (
    id                     BIGSERIAL   PRIMARY KEY,
    cash_register_close_id BIGINT      NOT NULL REFERENCES cash_register_closes(id) ON DELETE CASCADE,
    branch_id              BIGINT      NOT NULL,
    advisor_user_id        BIGINT      NOT NULL,
    admin_user_id          BIGINT      NOT NULL,
    reason                 TEXT        NOT NULL,
    before_snapshot        JSONB       NULL,
    after_snapshot         JSONB       NULL,
    acknowledged_at        TIMESTAMPTZ NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccadj_close   ON cash_register_close_adjustments(cash_register_close_id);
CREATE INDEX IF NOT EXISTS idx_ccadj_advisor ON cash_register_close_adjustments(advisor_user_id);
CREATE INDEX IF NOT EXISTS idx_ccadj_branch  ON cash_register_close_adjustments(branch_id);
