-- ============================================================================
-- Phase 23 — Marketing Promotions Engine
--   Adds the `promotions` campaign table (evaluated automatically at checkout)
--   and audit columns on `sales` recording the applied promotion.
-- ============================================================================

CREATE TABLE IF NOT EXISTS promotions (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(150)  NOT NULL,
    type                VARCHAR(30)   NOT NULL CHECK (type IN ('cart_total','fixed_amount','birthday','category','second_pair','cross_product')),
    active              BOOLEAN       NOT NULL DEFAULT TRUE,
    priority            INTEGER       NOT NULL DEFAULT 0,
    stackable           BOOLEAN       NOT NULL DEFAULT FALSE,
    discount_percentage NUMERIC(5,2)  NULL,
    discount_amount     NUMERIC(12,2) NULL,
    min_cart_total      NUMERIC(12,2) NULL,
    min_quantity        INTEGER       NULL,
    scope               VARCHAR(20)   NOT NULL DEFAULT 'cart' CHECK (scope IN ('cart','category','brand','product_type')),
    product_category_id BIGINT        NULL REFERENCES product_categories(id) ON DELETE SET NULL,
    brand_id            BIGINT        NULL REFERENCES brands(id) ON DELETE SET NULL,
    product_type        VARCHAR(30)   NULL,
    trigger_scope               VARCHAR(20) NULL CHECK (trigger_scope IN ('cart','category','brand','product_type')),
    trigger_product_category_id BIGINT      NULL REFERENCES product_categories(id) ON DELETE SET NULL,
    trigger_brand_id             BIGINT     NULL REFERENCES brands(id) ON DELETE SET NULL,
    trigger_product_type         VARCHAR(30) NULL,
    start_date          TIMESTAMPTZ   NULL,
    end_date            TIMESTAMPTZ   NULL,
    description         TEXT          NULL,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ   NULL
);

CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_promotions_window ON promotions(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_promotions_type   ON promotions(type) WHERE deleted_at IS NULL;

-- Attach the shared updated_at trigger only when the function is present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    DROP TRIGGER IF EXISTS set_promotions_updated_at ON promotions;
    CREATE TRIGGER set_promotions_updated_at BEFORE UPDATE ON promotions
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Audit columns on sales: which promotion applied and the currency amount granted.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS promotion_id BIGINT NULL REFERENCES promotions(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS promotion_discount NUMERIC(12,2) NOT NULL DEFAULT 0;
