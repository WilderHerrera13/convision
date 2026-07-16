-- Tenant migration 022: Ensure appointments carries the billing-tracking
-- columns used by sale.updateAppointmentBilling() and the new
-- AppointmentFilter.IsBilled (docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md,
-- section 05, P0 #3). These columns already exist on domain.Appointment
-- (internal/domain/appointment.go) and are created via AutoMigrate in
-- local/dev environments, but had never been captured in a numbered tenant
-- migration — so a tenant schema bootstrapped only from these SQL files
-- would be missing them. Idempotent — safe to run even where AutoMigrate
-- already added the columns.

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS is_billed BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS billed_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS sale_id   BIGINT      NULL REFERENCES sales(id) ON DELETE SET NULL;

-- Sales queue lookup: "not yet billed" is the hot filter for the
-- receptionist sales queue (AppointmentFilter.IsBilled=false).
CREATE INDEX IF NOT EXISTS idx_appointments_sales_queue
    ON appointments(status)
    WHERE is_billed = FALSE;

CREATE INDEX IF NOT EXISTS idx_appointments_sale_id
    ON appointments(sale_id)
    WHERE sale_id IS NOT NULL;
