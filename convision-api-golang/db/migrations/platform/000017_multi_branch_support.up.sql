-- ============================================================
-- 000017 — Multi-Branch Support
-- ============================================================

-- 1. CREATE branches table
CREATE TABLE IF NOT EXISTS branches (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    address    VARCHAR(255),
    city       VARCHAR(100),
    phone      VARCHAR(30),
    email      VARCHAR(150),
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Trigger: auto-update updated_at on branches
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_branches_set_updated_at'
          AND tgrelid = 'branches'::regclass
    ) THEN
        CREATE TRIGGER trg_branches_set_updated_at
        BEFORE UPDATE ON branches
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

-- 3. Index on is_active for branch lookups
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active) WHERE is_active = TRUE;

-- 4. Seed default branch (idempotent)
INSERT INTO branches (id, name, address, city, phone, email, is_active, created_at, updated_at)
VALUES (1, 'Principal', '', '', '', '', TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Advance sequence past the seeded id to prevent duplicate key on next insert
SELECT setval('branches_id_seq', GREATEST(1, (SELECT COALESCE(MAX(id), 0) FROM branches)));

-- 5. CREATE user_branches table
CREATE TABLE IF NOT EXISTS user_branches (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id  INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branches_user_id   ON user_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch_id ON user_branches(branch_id);

-- ============================================================
-- 6. RENAME clinic_id → branch_id on inventory tables
--    (warehouses, warehouse_locations, inventory_items, inventory_transfers)
-- ============================================================

-- warehouses
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'warehouses' AND column_name = 'clinic_id') THEN
        ALTER TABLE warehouses RENAME COLUMN clinic_id TO branch_id;
    END IF;
END;
$$;

ALTER TABLE warehouses
    DROP CONSTRAINT IF EXISTS warehouses_clinic_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_warehouses_clinic_id;

ALTER TABLE warehouses
    ADD CONSTRAINT fk_warehouses_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

-- Backfill warehouses that might have NULL branch_id after rename
UPDATE warehouses SET branch_id = 1 WHERE branch_id IS NULL;

-- warehouse_locations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'warehouse_locations' AND column_name = 'clinic_id') THEN
        ALTER TABLE warehouse_locations RENAME COLUMN clinic_id TO branch_id;
    END IF;
END;
$$;

ALTER TABLE warehouse_locations
    DROP CONSTRAINT IF EXISTS warehouse_locations_clinic_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_warehouse_locations_clinic_id;

ALTER TABLE warehouse_locations
    ADD CONSTRAINT fk_warehouse_locations_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

UPDATE warehouse_locations SET branch_id = 1 WHERE branch_id IS NULL;

-- inventory_items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'inventory_items' AND column_name = 'clinic_id') THEN
        ALTER TABLE inventory_items RENAME COLUMN clinic_id TO branch_id;
    END IF;
END;
$$;

ALTER TABLE inventory_items
    DROP CONSTRAINT IF EXISTS inventory_items_clinic_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_inventory_items_clinic_id;

ALTER TABLE inventory_items
    ADD CONSTRAINT fk_inventory_items_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

UPDATE inventory_items SET branch_id = 1 WHERE branch_id IS NULL;

-- inventory_transfers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'inventory_transfers' AND column_name = 'clinic_id') THEN
        ALTER TABLE inventory_transfers RENAME COLUMN clinic_id TO branch_id;
    END IF;
END;
$$;

ALTER TABLE inventory_transfers
    DROP CONSTRAINT IF EXISTS inventory_transfers_clinic_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_inventory_transfers_clinic_id;

ALTER TABLE inventory_transfers
    ADD CONSTRAINT fk_inventory_transfers_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

UPDATE inventory_transfers SET branch_id = 1 WHERE branch_id IS NULL;

-- ============================================================
-- 7. RENAME clinic_id → branch_id on clinical record tables
--    (clinical_records, anamneses, visual_exams, diagnoses, prescriptions)
-- ============================================================

-- clinical_records
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'clinical_records' AND column_name = 'clinic_id') THEN
        ALTER TABLE clinical_records RENAME COLUMN clinic_id TO branch_id;
    END IF;
END;
$$;

ALTER TABLE clinical_records
    DROP CONSTRAINT IF EXISTS clinical_records_clinic_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_clinical_records_clinic_id;

ALTER TABLE clinical_records
    ADD CONSTRAINT fk_clinical_records_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

UPDATE clinical_records SET branch_id = 1 WHERE branch_id IS NULL;

-- anamneses
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'anamneses' AND column_name = 'clinic_id') THEN
        ALTER TABLE anamneses RENAME COLUMN clinic_id TO branch_id;
    END IF;
END;
$$;

ALTER TABLE anamneses
    DROP CONSTRAINT IF EXISTS anamneses_clinic_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_anamneses_clinic_id;

ALTER TABLE anamneses
    ADD CONSTRAINT fk_anamneses_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

UPDATE anamneses SET branch_id = 1 WHERE branch_id IS NULL;

-- visual_exams
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'visual_exams' AND column_name = 'clinic_id') THEN
        ALTER TABLE visual_exams RENAME COLUMN clinic_id TO branch_id;
    END IF;
END;
$$;

ALTER TABLE visual_exams
    DROP CONSTRAINT IF EXISTS visual_exams_clinic_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_visual_exams_clinic_id;

ALTER TABLE visual_exams
    ADD CONSTRAINT fk_visual_exams_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

UPDATE visual_exams SET branch_id = 1 WHERE branch_id IS NULL;

-- diagnoses
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'diagnoses' AND column_name = 'clinic_id') THEN
        ALTER TABLE diagnoses RENAME COLUMN clinic_id TO branch_id;
    END IF;
END;
$$;

ALTER TABLE diagnoses
    DROP CONSTRAINT IF EXISTS diagnoses_clinic_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_diagnoses_clinic_id;

ALTER TABLE diagnoses
    ADD CONSTRAINT fk_diagnoses_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

UPDATE diagnoses SET branch_id = 1 WHERE branch_id IS NULL;

-- prescriptions (ClinicalPrescription maps to prescriptions table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'prescriptions' AND column_name = 'clinic_id') THEN
        ALTER TABLE prescriptions RENAME COLUMN clinic_id TO branch_id;
    END IF;
END;
$$;

ALTER TABLE prescriptions
    DROP CONSTRAINT IF EXISTS prescriptions_clinic_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_prescriptions_clinic_id;

ALTER TABLE prescriptions
    ADD CONSTRAINT fk_prescriptions_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

UPDATE prescriptions SET branch_id = 1 WHERE branch_id IS NULL;

-- ============================================================
-- 8. ADD branch_id to tables that never had it
--    (appointments, sales, cash_register_closes, daily_activity_reports)
-- ============================================================

-- appointments
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS branch_id INTEGER DEFAULT 1;

UPDATE appointments SET branch_id = 1 WHERE branch_id IS NULL;

ALTER TABLE appointments
    ALTER COLUMN branch_id SET NOT NULL,
    DROP CONSTRAINT IF EXISTS fk_appointments_branch_id;

ALTER TABLE appointments
    ADD CONSTRAINT fk_appointments_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

CREATE INDEX IF NOT EXISTS idx_appointments_branch_id
    ON appointments(branch_id) WHERE deleted_at IS NULL;

-- sales
ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS branch_id INTEGER DEFAULT 1;

UPDATE sales SET branch_id = 1 WHERE branch_id IS NULL;

ALTER TABLE sales
    ALTER COLUMN branch_id SET NOT NULL,
    DROP CONSTRAINT IF EXISTS fk_sales_branch_id;

ALTER TABLE sales
    ADD CONSTRAINT fk_sales_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);

-- cash_register_closes
ALTER TABLE cash_register_closes
    ADD COLUMN IF NOT EXISTS branch_id INTEGER DEFAULT 1;

UPDATE cash_register_closes SET branch_id = 1 WHERE branch_id IS NULL;

ALTER TABLE cash_register_closes
    ALTER COLUMN branch_id SET NOT NULL,
    DROP CONSTRAINT IF EXISTS fk_cash_register_closes_branch_id;

ALTER TABLE cash_register_closes
    ADD CONSTRAINT fk_cash_register_closes_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

CREATE INDEX IF NOT EXISTS idx_cash_register_closes_branch_id ON cash_register_closes(branch_id);

-- daily_activity_reports
ALTER TABLE daily_activity_reports
    ADD COLUMN IF NOT EXISTS branch_id INTEGER DEFAULT 1;

UPDATE daily_activity_reports SET branch_id = 1 WHERE branch_id IS NULL;

ALTER TABLE daily_activity_reports
    ALTER COLUMN branch_id SET NOT NULL,
    DROP CONSTRAINT IF EXISTS fk_daily_activity_reports_branch_id;

ALTER TABLE daily_activity_reports
    ADD CONSTRAINT fk_daily_activity_reports_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);

CREATE INDEX IF NOT EXISTS idx_daily_activity_reports_branch_id ON daily_activity_reports(branch_id);

-- stock_movements: add branch_id if it exists from migration 000016
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'stock_movements' AND column_name = 'branch_id') THEN
            ALTER TABLE stock_movements ADD COLUMN branch_id INTEGER DEFAULT 1;
            UPDATE stock_movements SET branch_id = 1 WHERE branch_id IS NULL;
            ALTER TABLE stock_movements ALTER COLUMN branch_id SET NOT NULL;
            ALTER TABLE stock_movements
                ADD CONSTRAINT fk_stock_movements_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);
            CREATE INDEX IF NOT EXISTS idx_stock_movements_branch_id ON stock_movements(branch_id);
        END IF;
    END IF;
END;
$$;

-- inventory_adjustments: add branch_id if table exists from migration 000016
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_adjustments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'inventory_adjustments' AND column_name = 'branch_id') THEN
            ALTER TABLE inventory_adjustments ADD COLUMN branch_id INTEGER DEFAULT 1;
            UPDATE inventory_adjustments SET branch_id = 1 WHERE branch_id IS NULL;
            ALTER TABLE inventory_adjustments ALTER COLUMN branch_id SET NOT NULL;
            ALTER TABLE inventory_adjustments
                ADD CONSTRAINT fk_inventory_adjustments_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);
            CREATE INDEX IF NOT EXISTS idx_inv_adjustments_branch_id ON inventory_adjustments(branch_id);
        END IF;
    END IF;
END;
$$;
