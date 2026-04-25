ALTER TABLE laboratory_orders
  DROP COLUMN IF EXISTS rx_od,
  DROP COLUMN IF EXISTS rx_oi,
  DROP COLUMN IF EXISTS lens_od,
  DROP COLUMN IF EXISTS lens_oi,
  DROP COLUMN IF EXISTS frame_specs,
  DROP COLUMN IF EXISTS seller_name,
  DROP COLUMN IF EXISTS sale_date,
  DROP COLUMN IF EXISTS branch,
  DROP COLUMN IF EXISTS special_instructions,
  DROP COLUMN IF EXISTS pdf_token;
