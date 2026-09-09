ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS catalog_sources (
  code varchar(40) PRIMARY KEY,
  display_name varchar(80) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'syncing', 'healthy', 'failed', 'disabled')),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  next_sync_at timestamptz,
  last_error text,
  updated_parts integer NOT NULL DEFAULT 0 CHECK (updated_parts >= 0),
  candidate_count integer NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO catalog_sources (code, display_name, status)
VALUES ('taobao', '淘宝开放平台', 'disabled')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS catalog_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code varchar(40) NOT NULL REFERENCES catalog_sources(code),
  status varchar(20) NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  fetched_count integer NOT NULL DEFAULT 0 CHECK (fetched_count >= 0),
  updated_parts integer NOT NULL DEFAULT 0 CHECK (updated_parts >= 0),
  candidate_count integer NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
  error_message text
);
CREATE INDEX IF NOT EXISTS catalog_sync_runs_source_started_idx ON catalog_sync_runs(source_code, started_at DESC);

CREATE TABLE IF NOT EXISTS part_market_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code varchar(40) NOT NULL REFERENCES catalog_sources(code),
  external_id varchar(160) NOT NULL,
  part_id varchar(100) NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  title text NOT NULL,
  seller_name varchar(160) NOT NULL DEFAULT '',
  price_fen integer NOT NULL CHECK (price_fen >= 0),
  product_url text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_code, external_id)
);
CREATE INDEX IF NOT EXISTS part_market_offers_part_fetched_idx ON part_market_offers(part_id, fetched_at DESC);

CREATE TABLE IF NOT EXISTS catalog_sync_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code varchar(40) NOT NULL REFERENCES catalog_sources(code),
  external_id varchar(160) NOT NULL,
  category_code varchar(32) NOT NULL,
  title text NOT NULL,
  brand varchar(100) NOT NULL DEFAULT '',
  model varchar(160) NOT NULL DEFAULT '',
  price_fen integer NOT NULL CHECK (price_fen >= 0),
  product_url text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'rejected')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_code, external_id)
);
CREATE INDEX IF NOT EXISTS catalog_sync_candidates_status_category_idx ON catalog_sync_candidates(status, category_code, last_seen_at DESC);
