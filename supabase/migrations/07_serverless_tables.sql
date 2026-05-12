-- Tables that replace in-memory Maps which do not survive across
-- serverless function instances (Vercel cold starts, multiple workers).

-- Rate limiting (replaces lib/rate-limit.ts Map)
CREATE TABLE IF NOT EXISTS rate_limits (
  key          text        PRIMARY KEY,
  attempts     integer     NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No public policies: accessed only via service role key in server code.

-- Import sessions for CSV upload flow (replaces lib/import-sessions.ts Map)
-- Sessions are pruned at creation time; no background job needed.
CREATE TABLE IF NOT EXISTS import_sessions (
  id         uuid        PRIMARY KEY,
  data       jsonb       NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;
-- No public policies: accessed only via service role key in server code.
