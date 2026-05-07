-- Migration 000036: optica-level permission ceiling table
-- Stores which permission keys a super admin has allowed for each optica.
-- Empty set = no restriction (all permissions pass through).

CREATE TABLE IF NOT EXISTS platform.optica_allowed_permissions (
    optica_id      INTEGER     NOT NULL REFERENCES platform.opticas(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (optica_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_oap_optica_id
    ON platform.optica_allowed_permissions (optica_id);
