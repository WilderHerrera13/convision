DO $ren$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'users' AND column_name = 'password_hash'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'users' AND column_name = 'password'
  ) THEN
    ALTER TABLE users RENAME COLUMN password_hash TO password;
  END IF;
END
$ren$;
