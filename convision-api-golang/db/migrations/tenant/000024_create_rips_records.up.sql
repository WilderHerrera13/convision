-- Tenant migration 024: RIPS records (Resolución 2275/2023 FEV-RIPS).
--
-- One row per signed ClinicalRecord — payload holds the full JSON
-- transaction (numDocumentoIdObligado/numFactura/usuarios[]/servicios.
-- consultas[]) built by internal/rips. invoice_number stays NULL until a
-- real Factura Electrónica de Venta exists (convision-invoicing-api), per
-- docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md section 07.

CREATE TABLE IF NOT EXISTS rips_records (
    id                  BIGSERIAL     PRIMARY KEY,
    clinical_record_id  BIGINT        NOT NULL REFERENCES clinical_records(id) ON DELETE RESTRICT,
    appointment_id      BIGINT        NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
    patient_id          BIGINT        NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    invoice_number      VARCHAR(30),
    payload             JSONB         NOT NULL,
    status              VARCHAR(30)   NOT NULL DEFAULT 'pending_invoice'
                                      CHECK (status IN ('pending_invoice','pending_transmission','sent','error')),
    transmission_mode   VARCHAR(20)   NOT NULL DEFAULT 'none',
    transmitted_at      TIMESTAMPTZ,
    error_message       TEXT,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_rips_records_clinical_record UNIQUE (clinical_record_id)
);

CREATE INDEX IF NOT EXISTS idx_rips_records_status     ON rips_records(status);
CREATE INDEX IF NOT EXISTS idx_rips_records_patient_id ON rips_records(patient_id);
