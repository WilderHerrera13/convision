-- Rename users.role to users.role_type for RBAC migration (Phase 19)
ALTER TABLE users RENAME COLUMN role TO role_type;
ALTER TABLE users ALTER COLUMN role_type SET DEFAULT 'receptionist';
-- Drop existing constraint if it exists from a previous partial migration, then add
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'users' AND constraint_name = 'chk_users_role_type') THEN
        ALTER TABLE users DROP CONSTRAINT chk_users_role_type;
    END IF;
END $$;
ALTER TABLE users ADD CONSTRAINT chk_users_role_type CHECK (role_type IN ('admin','specialist','receptionist','laboratory'));
