-- Tenant migration 012: Cash register closes and transfers

CREATE TABLE IF NOT EXISTS cash_register_closes (
    id                        BIGSERIAL      PRIMARY KEY,
    user_id                   BIGINT         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    clinic_id                 BIGINT         REFERENCES clinics(id) ON DELETE SET NULL,
    close_date                TIMESTAMPTZ,
    status                    TEXT           NOT NULL DEFAULT 'draft'
                                             CHECK (status IN ('draft','submitted','approved')),
    total_counted             NUMERIC(12,2)  NOT NULL DEFAULT 0,
    total_actual_amount       NUMERIC(12,2)  NOT NULL DEFAULT 0,
    admin_actuals_recorded_at TIMESTAMPTZ,
    admin_notes               TEXT,
    advisor_notes             TEXT,
    approved_by               BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    approved_at               TIMESTAMPTZ,
    created_at                TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_closes_user_id    ON cash_register_closes(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_closes_close_date ON cash_register_closes(close_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_closes_status     ON cash_register_closes(status);

CREATE TABLE IF NOT EXISTS cash_register_close_payments (
    id                    BIGSERIAL      PRIMARY KEY,
    cash_register_close_id BIGINT        NOT NULL REFERENCES cash_register_closes(id) ON DELETE CASCADE,
    payment_method_name   TEXT           NOT NULL,
    counted_amount        NUMERIC(12,2)  NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crc_payments_close_id ON cash_register_close_payments(cash_register_close_id);

CREATE TABLE IF NOT EXISTS cash_register_close_actual_payments (
    id                    BIGSERIAL      PRIMARY KEY,
    cash_register_close_id BIGINT        NOT NULL REFERENCES cash_register_closes(id) ON DELETE CASCADE,
    payment_method_name   TEXT           NOT NULL,
    actual_amount         NUMERIC(12,2)  NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crc_actual_payments_close_id ON cash_register_close_actual_payments(cash_register_close_id);

CREATE TABLE IF NOT EXISTS cash_count_denominations (
    id                    BIGSERIAL      PRIMARY KEY,
    cash_register_close_id BIGINT        NOT NULL REFERENCES cash_register_closes(id) ON DELETE CASCADE,
    denomination          INTEGER        NOT NULL,
    quantity              INTEGER        NOT NULL DEFAULT 0,
    subtotal              NUMERIC(12,2)  NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_denoms_close_id ON cash_count_denominations(cash_register_close_id);

CREATE TABLE IF NOT EXISTS cash_transfers (
    id                  BIGSERIAL      PRIMARY KEY,
    transfer_number     TEXT           NOT NULL UNIQUE,
    type                TEXT           NOT NULL
                                       CHECK (type IN ('internal','bank_deposit','bank_withdrawal','petty_cash')),
    from_account        TEXT,
    to_account          TEXT,
    amount              NUMERIC(12,2)  NOT NULL,
    currency            TEXT           NOT NULL DEFAULT 'COP',
    transfer_date       TIMESTAMPTZ,
    concept             TEXT,
    description         TEXT,
    reference_number    TEXT,
    status              TEXT           NOT NULL DEFAULT 'pending'
                                       CHECK (status IN ('pending','approved','rejected')),
    notes               TEXT,
    created_by_user_id  BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    approved_by_user_id BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_date   ON cash_transfers(transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_status ON cash_transfers(status);
