ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_intent_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz DEFAULT NULL;

-- Expand payment_status check to include 'failed' and 'cash'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cash'));

-- Allow business_config payment settings
ALTER TABLE business_config
  ADD COLUMN IF NOT EXISTS online_payment_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cash_on_delivery_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cash_on_pickup_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_payment_intent
  ON orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
