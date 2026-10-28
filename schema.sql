CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid PRIMARY KEY,
  day_id text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  owner_hash text NOT NULL
);
CREATE INDEX IF NOT EXISTS workout_sessions_owner_started_idx ON workout_sessions (owner_hash, started_at DESC);

CREATE TABLE IF NOT EXISTS workout_program_days (
  owner_hash text NOT NULL,
  day_id text NOT NULL,
  updated_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (owner_hash, day_id)
);
