CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_menu_item
  ON order_items(menu_item_id);
