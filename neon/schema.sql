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

-- Existing drafts are deliberately not backfilled: their bytes need revalidation.
ALTER TABLE beisawa_drafts ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE beisawa_drafts ADD COLUMN IF NOT EXISTS snapshot jsonb;
CREATE TABLE IF NOT EXISTS beisawa_approvals (
  draft_id text PRIMARY KEY REFERENCES beisawa_drafts(draft_id),
  owner_id text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  approver_id text NOT NULL,
  approver_name text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approve', 'reject')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS beisawa_filed_reports (
  report_id text PRIMARY KEY,
  draft_id text NOT NULL UNIQUE REFERENCES beisawa_approvals(draft_id),
  owner_id text NOT NULL,
  content_hash text NOT NULL,
  snapshot jsonb NOT NULL,
  approval jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS beisawa_filed_owner ON beisawa_filed_reports(owner_id, created_at DESC);

ALTER TABLE beisawa_drafts ADD COLUMN IF NOT EXISTS gate_checkpoint jsonb;
