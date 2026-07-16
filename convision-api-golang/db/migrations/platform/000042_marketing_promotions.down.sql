-- Reverse Phase 23 — Marketing Promotions Engine.

ALTER TABLE sales DROP COLUMN IF EXISTS promotion_discount;
ALTER TABLE sales DROP COLUMN IF EXISTS promotion_id;

DROP TABLE IF EXISTS promotions;
