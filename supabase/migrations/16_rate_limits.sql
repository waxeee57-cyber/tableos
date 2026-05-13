-- Supabase-backed rate limiter
-- Replaces the in-memory Map in lib/rate-limit.ts so limits persist
-- across serverless function instances.
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can touch this table
CREATE POLICY "Service role only" ON rate_limits
  USING (false) WITH CHECK (false);

-- Atomic upsert function: increments attempts within the current window,
-- or resets when the window has expired. Returns true if the request is
-- within the allowed limit.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key    text,
  p_limit  integer,
  p_window_ms bigint   -- window duration in milliseconds
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempts integer;
  v_window   interval := p_window_ms * interval '1 millisecond';
BEGIN
  INSERT INTO rate_limits (key, attempts, window_start)
  VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE SET
    attempts = CASE
      WHEN rate_limits.window_start < (now() - v_window)
      THEN 1          -- expired window: reset counter
      ELSE rate_limits.attempts + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < (now() - v_window)
      THEN now()      -- start fresh window
      ELSE rate_limits.window_start
    END
  RETURNING attempts INTO v_attempts;

  -- Probabilistic cleanup of stale keys (1% of calls)
  IF random() < 0.01 THEN
    DELETE FROM rate_limits
    WHERE window_start < now() - interval '24 hours';
  END IF;

  RETURN v_attempts <= p_limit;
END;
$$;
