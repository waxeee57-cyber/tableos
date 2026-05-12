ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source text
  DEFAULT 'online' CHECK (
    source IN ('online', 'phone', 'walk_in', 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);
