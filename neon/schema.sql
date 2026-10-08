CREATE TABLE IF NOT EXISTS beisawa_reviews (
  review_id text PRIMARY KEY,
  owner_id text NOT NULL,
  record_key text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS beisawa_reviews_owner ON beisawa_reviews(owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS beisawa_drafts (
  draft_id text PRIMARY KEY,
  owner_id text NOT NULL,
  record_key text NOT NULL,
  object_key text NOT NULL UNIQUE,
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS beisawa_drafts_owner ON beisawa_drafts(owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS beisawa_events (
  event_id text PRIMARY KEY,
  owner_id text NOT NULL,
  event jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS beisawa_events_owner ON beisawa_events(owner_id, created_at DESC);
