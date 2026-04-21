CREATE TABLE IF NOT EXISTS bulk_import_logs (
    id           BIGSERIAL    PRIMARY KEY,
    import_type  VARCHAR(50)  NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    total_rows   INTEGER      NOT NULL DEFAULT 0,
    created      INTEGER      NOT NULL DEFAULT 0,
    skipped      INTEGER      NOT NULL DEFAULT 0,
    errors       INTEGER      NOT NULL DEFAULT 0,
    processed_by INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bil_type_at ON bulk_import_logs(import_type, processed_at DESC);
