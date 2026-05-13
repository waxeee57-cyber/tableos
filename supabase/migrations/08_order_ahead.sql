ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_reservation_id ON orders(reservation_id) WHERE reservation_id IS NOT NULL;
