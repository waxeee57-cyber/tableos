-- Supabase-backed import session store
-- Replaces the in-memory Map in lib/import-sessions.ts so sessions survive
-- across serverless function instances (parse → preview → execute flow).
CREATE TABLE IF NOT EXISTS import_sessions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  data       jsonb       NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role can touch this table
CREATE POLICY "Service role only" ON import_sessions
  USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_import_sessions_created_at
  ON import_sessions (created_at);
