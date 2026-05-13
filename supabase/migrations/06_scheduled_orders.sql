ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_scheduled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_scheduled_for ON orders(scheduled_for) WHERE is_scheduled = true;
