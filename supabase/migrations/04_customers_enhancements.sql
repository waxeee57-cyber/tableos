-- ============================================
-- Customers table enhancements + import audit
-- ============================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_order_at timestamptz,
  ADD COLUMN IF NOT EXISTS preferred_payment_method text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'online' CHECK (
    source IN ('online', 'imported', 'manual', 'phone')
  ),
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid;

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_is_vip ON customers(is_vip);
CREATE INDEX IF NOT EXISTS idx_customers_last_order ON customers(last_order_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_phone_key'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_phone_key UNIQUE (phone);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS customer_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text,
  total_rows integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  duplicates_count integer NOT NULL DEFAULT 0,
  errors_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'preview', 'completed', 'failed', 'rolled_back')
  ),
  duplicate_decisions jsonb DEFAULT '[]'::jsonb,
  error_log jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE customer_imports ENABLE ROW LEVEL SECURITY;
-- No public access. Admin only via service role.

ALTER TABLE business_config
  ADD COLUMN IF NOT EXISTS total_customers integer DEFAULT 0;
