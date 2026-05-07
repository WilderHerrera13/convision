ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role_type;
ALTER TABLE users ALTER COLUMN role_type SET DEFAULT 'receptionist';
ALTER TABLE users RENAME COLUMN role_type TO role;
