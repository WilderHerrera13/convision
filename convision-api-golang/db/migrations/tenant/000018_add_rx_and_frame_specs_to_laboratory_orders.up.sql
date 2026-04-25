ALTER TABLE laboratory_orders
  ADD COLUMN IF NOT EXISTS rx_od          TEXT,
  ADD COLUMN IF NOT EXISTS rx_oi          TEXT,
  ADD COLUMN IF NOT EXISTS lens_od        TEXT,
  ADD COLUMN IF NOT EXISTS lens_oi        TEXT,
  ADD COLUMN IF NOT EXISTS frame_specs    TEXT,
  ADD COLUMN IF NOT EXISTS seller_name    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sale_date      DATE,
  ADD COLUMN IF NOT EXISTS branch         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS special_instructions TEXT,
  ADD COLUMN IF NOT EXISTS pdf_token      VARCHAR(255);
