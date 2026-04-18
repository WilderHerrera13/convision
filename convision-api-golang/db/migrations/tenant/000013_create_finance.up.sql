-- Tenant migration 013: Finance (expenses, payroll, service orders, daily activity reports)

CREATE TABLE IF NOT EXISTS expenses (
    id                BIGSERIAL      PRIMARY KEY,
    supplier_id       BIGINT         REFERENCES suppliers(id) ON DELETE SET NULL,
    invoice_number    TEXT,
    concept           TEXT,
    description       TEXT,
    expense_date      TIMESTAMPTZ,
    amount            NUMERIC(12,2)  NOT NULL DEFAULT 0,
    payment_amount    NUMERIC(12,2)  NOT NULL DEFAULT 0,
    balance           NUMERIC(12,2)  NOT NULL DEFAULT 0,
    tax_excluded      BOOLEAN        NOT NULL DEFAULT false,
    payment_method_id BIGINT         REFERENCES payment_methods(id) ON DELETE SET NULL,
    reference         TEXT,
    notes             TEXT,
    created_by        BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id  ON expenses(supplier_id);

CREATE TABLE IF NOT EXISTS payroll (
    id                       BIGSERIAL      PRIMARY KEY,
    employee_name            TEXT           NOT NULL,
    employee_identification  TEXT,
    employee_position        TEXT,
    pay_period_start         TIMESTAMPTZ,
    pay_period_end           TIMESTAMPTZ,
    base_salary              NUMERIC(12,2)  NOT NULL DEFAULT 0,
    overtime_hours           NUMERIC(5,2)   NOT NULL DEFAULT 0,
    overtime_rate            NUMERIC(12,2)  NOT NULL DEFAULT 0,
    overtime_amount          NUMERIC(12,2)  NOT NULL DEFAULT 0,
    bonuses                  NUMERIC(12,2)  NOT NULL DEFAULT 0,
    commissions              NUMERIC(12,2)  NOT NULL DEFAULT 0,
    other_income             NUMERIC(12,2)  NOT NULL DEFAULT 0,
    gross_salary             NUMERIC(12,2)  NOT NULL DEFAULT 0,
    health_deduction         NUMERIC(12,2)  NOT NULL DEFAULT 0,
    pension_deduction        NUMERIC(12,2)  NOT NULL DEFAULT 0,
    tax_deduction            NUMERIC(12,2)  NOT NULL DEFAULT 0,
    other_deductions         NUMERIC(12,2)  NOT NULL DEFAULT 0,
    total_deductions         NUMERIC(12,2)  NOT NULL DEFAULT 0,
    net_salary               NUMERIC(12,2)  NOT NULL DEFAULT 0,
    payment_date             TIMESTAMPTZ,
    payment_method_id        BIGINT         REFERENCES payment_methods(id) ON DELETE SET NULL,
    reference                TEXT,
    notes                    TEXT,
    status                   TEXT           NOT NULL DEFAULT 'pending'
                                            CHECK (status IN ('pending','paid','cancelled')),
    created_by               BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payroll_pay_period ON payroll(pay_period_start DESC);

CREATE TABLE IF NOT EXISTS service_orders (
    id                      BIGSERIAL      PRIMARY KEY,
    order_number            TEXT           NOT NULL UNIQUE,
    supplier_id             BIGINT         REFERENCES suppliers(id) ON DELETE SET NULL,
    customer_name           TEXT,
    customer_phone          TEXT,
    customer_email          TEXT,
    service_type            TEXT,
    description             TEXT,
    lens_horizontal_axis    NUMERIC(5,2),
    lens_vertical_axis      NUMERIC(5,2),
    lens_distance           NUMERIC(5,2),
    estimated_cost          NUMERIC(12,2)  NOT NULL DEFAULT 0,
    final_cost              NUMERIC(12,2)  NOT NULL DEFAULT 0,
    estimated_delivery_date TIMESTAMPTZ,
    actual_delivery_date    TIMESTAMPTZ,
    priority                TEXT           NOT NULL DEFAULT 'normal'
                                           CHECK (priority IN ('low','normal','high','urgent')),
    status                  TEXT           NOT NULL DEFAULT 'pending'
                                           CHECK (status IN ('pending','in_progress','completed','cancelled')),
    notes                   TEXT,
    observations            TEXT,
    created_by              BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_orders_status      ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_supplier_id ON service_orders(supplier_id);

CREATE TABLE IF NOT EXISTS daily_activity_reports (
    id                           BIGSERIAL      PRIMARY KEY,
    user_id                      BIGINT         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    clinic_id                    BIGINT         REFERENCES clinics(id) ON DELETE SET NULL,
    report_date                  TIMESTAMPTZ,
    shift                        TEXT           CHECK (shift IN ('morning','afternoon','full')),
    preguntas_hombre             INTEGER        NOT NULL DEFAULT 0,
    preguntas_mujeres            INTEGER        NOT NULL DEFAULT 0,
    preguntas_ninos              INTEGER        NOT NULL DEFAULT 0,
    cotizaciones_hombre          INTEGER        NOT NULL DEFAULT 0,
    cotizaciones_mujeres         INTEGER        NOT NULL DEFAULT 0,
    cotizaciones_ninos           INTEGER        NOT NULL DEFAULT 0,
    consultas_efectivas_hombre   INTEGER        NOT NULL DEFAULT 0,
    consultas_efectivas_mujeres  INTEGER        NOT NULL DEFAULT 0,
    consultas_efectivas_ninos    INTEGER        NOT NULL DEFAULT 0,
    consulta_venta_formula       INTEGER        NOT NULL DEFAULT 0,
    consultas_no_efectivas       INTEGER        NOT NULL DEFAULT 0,
    bonos_entregados             INTEGER        NOT NULL DEFAULT 0,
    bonos_redimidos              INTEGER        NOT NULL DEFAULT 0,
    sistecreditos_realizados     INTEGER        NOT NULL DEFAULT 0,
    addi_realizados              INTEGER        NOT NULL DEFAULT 0,
    control_seguimiento          INTEGER        NOT NULL DEFAULT 0,
    seguimiento_garantias        INTEGER        NOT NULL DEFAULT 0,
    ordenes                      INTEGER        NOT NULL DEFAULT 0,
    plan_separe                  INTEGER        NOT NULL DEFAULT 0,
    otras_ventas                 INTEGER        NOT NULL DEFAULT 0,
    entregas                     INTEGER        NOT NULL DEFAULT 0,
    sistecreditos_abonos         INTEGER        NOT NULL DEFAULT 0,
    valor_ordenes                NUMERIC(12,2)  NOT NULL DEFAULT 0,
    publicaciones_facebook       INTEGER        NOT NULL DEFAULT 0,
    publicaciones_instagram      INTEGER        NOT NULL DEFAULT 0,
    publicaciones_whatsapp       INTEGER        NOT NULL DEFAULT 0,
    publicaciones_compartidas_fb INTEGER        NOT NULL DEFAULT 0,
    tiktok_realizados            INTEGER        NOT NULL DEFAULT 0,
    bonos_regalo_enviados        INTEGER        NOT NULL DEFAULT 0,
    bonos_fidelizacion_enviados  INTEGER        NOT NULL DEFAULT 0,
    mensajes_facebook            INTEGER        NOT NULL DEFAULT 0,
    mensajes_instagram           INTEGER        NOT NULL DEFAULT 0,
    mensajes_whatsapp            INTEGER        NOT NULL DEFAULT 0,
    entregas_realizadas          INTEGER        NOT NULL DEFAULT 0,
    etiquetas_clientes           INTEGER        NOT NULL DEFAULT 0,
    cotizaciones_trabajo         INTEGER        NOT NULL DEFAULT 0,
    ordenes_trabajo              INTEGER        NOT NULL DEFAULT 0,
    observations                 TEXT,
    recepciones_dinero           JSONB,
    created_at                   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_id     ON daily_activity_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date ON daily_activity_reports(report_date DESC);
