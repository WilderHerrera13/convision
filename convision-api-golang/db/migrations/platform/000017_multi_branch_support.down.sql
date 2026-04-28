-- ============================================================
-- 000017 — Multi-Branch Support (ROLLBACK)
-- ============================================================

-- Remove branch_id from daily_activity_reports
ALTER TABLE daily_activity_reports
    DROP CONSTRAINT IF EXISTS fk_daily_activity_reports_branch_id;
DROP INDEX IF EXISTS idx_daily_activity_reports_branch_id;
ALTER TABLE daily_activity_reports DROP COLUMN IF EXISTS branch_id;

-- Remove branch_id from cash_register_closes
ALTER TABLE cash_register_closes
    DROP CONSTRAINT IF EXISTS fk_cash_register_closes_branch_id;
DROP INDEX IF EXISTS idx_cash_register_closes_branch_id;
ALTER TABLE cash_register_closes DROP COLUMN IF EXISTS branch_id;

-- Remove branch_id from sales
ALTER TABLE sales
    DROP CONSTRAINT IF EXISTS fk_sales_branch_id;
DROP INDEX IF EXISTS idx_sales_branch_id;
ALTER TABLE sales DROP COLUMN IF EXISTS branch_id;

-- Remove branch_id from appointments
ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS fk_appointments_branch_id;
DROP INDEX IF EXISTS idx_appointments_branch_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS branch_id;

-- Rename branch_id → clinic_id on clinical tables
ALTER TABLE prescriptions
    DROP CONSTRAINT IF EXISTS fk_prescriptions_branch_id;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'prescriptions' AND column_name = 'branch_id') THEN
        ALTER TABLE prescriptions RENAME COLUMN branch_id TO clinic_id;
    END IF;
END;
$$;

ALTER TABLE diagnoses
    DROP CONSTRAINT IF EXISTS fk_diagnoses_branch_id;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'diagnoses' AND column_name = 'branch_id') THEN
        ALTER TABLE diagnoses RENAME COLUMN branch_id TO clinic_id;
    END IF;
END;
$$;

ALTER TABLE visual_exams
    DROP CONSTRAINT IF EXISTS fk_visual_exams_branch_id;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'visual_exams' AND column_name = 'branch_id') THEN
        ALTER TABLE visual_exams RENAME COLUMN branch_id TO clinic_id;
    END IF;
END;
$$;

ALTER TABLE anamneses
    DROP CONSTRAINT IF EXISTS fk_anamneses_branch_id;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'anamneses' AND column_name = 'branch_id') THEN
        ALTER TABLE anamneses RENAME COLUMN branch_id TO clinic_id;
    END IF;
END;
$$;

ALTER TABLE clinical_records
    DROP CONSTRAINT IF EXISTS fk_clinical_records_branch_id;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'clinical_records' AND column_name = 'branch_id') THEN
        ALTER TABLE clinical_records RENAME COLUMN branch_id TO clinic_id;
    END IF;
END;
$$;

-- Rename branch_id → clinic_id on inventory tables
ALTER TABLE inventory_transfers
    DROP CONSTRAINT IF EXISTS fk_inventory_transfers_branch_id;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'inventory_transfers' AND column_name = 'branch_id') THEN
        ALTER TABLE inventory_transfers RENAME COLUMN branch_id TO clinic_id;
    END IF;
END;
$$;

ALTER TABLE inventory_items
    DROP CONSTRAINT IF EXISTS fk_inventory_items_branch_id;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'inventory_items' AND column_name = 'branch_id') THEN
        ALTER TABLE inventory_items RENAME COLUMN branch_id TO clinic_id;
    END IF;
END;
$$;

ALTER TABLE warehouse_locations
    DROP CONSTRAINT IF EXISTS fk_warehouse_locations_branch_id;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'warehouse_locations' AND column_name = 'branch_id') THEN
        ALTER TABLE warehouse_locations RENAME COLUMN branch_id TO clinic_id;
    END IF;
END;
$$;

ALTER TABLE warehouses
    DROP CONSTRAINT IF EXISTS fk_warehouses_branch_id;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'warehouses' AND column_name = 'branch_id') THEN
        ALTER TABLE warehouses RENAME COLUMN branch_id TO clinic_id;
    END IF;
END;
$$;

-- Drop user_branches and branches
DROP TABLE IF EXISTS user_branches;

DROP TRIGGER IF EXISTS trg_branches_set_updated_at ON branches;
DROP INDEX IF EXISTS idx_branches_is_active;
DROP TABLE IF EXISTS branches;
