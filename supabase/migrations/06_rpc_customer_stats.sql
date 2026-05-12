-- Atomic customer aggregate helpers
-- Replaces read-modify-write patterns that cause race conditions under
-- concurrent orders from the same customer.

CREATE OR REPLACE FUNCTION increment_customer_stats(p_customer_id uuid, p_order_total integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE customers
  SET order_count = order_count + 1,
      total_spent = total_spent + p_order_total,
      updated_at  = now()
  WHERE id = p_customer_id;
$$;

CREATE OR REPLACE FUNCTION decrement_customer_stats(p_customer_id uuid, p_order_total integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE customers
  SET order_count = GREATEST(0, order_count - 1),
      total_spent = GREATEST(0, total_spent - p_order_total),
      updated_at  = now()
  WHERE id = p_customer_id;
$$;
