ALTER TABLE laboratory_orders
  ADD COLUMN IF NOT EXISTS drawer_number VARCHAR(20);
