CREATE TABLE IF NOT EXISTS user_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  CHECK (char_length(display_name) BETWEEN 2 AND 24)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id_hash varchar(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_expires_idx ON user_sessions(expires_at);

ALTER TABLE published_configurations ALTER COLUMN anonymous_id DROP NOT NULL;
ALTER TABLE published_configurations ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES user_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS published_configurations_owner_idx ON published_configurations(owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS configuration_engagement (
  configuration_key text PRIMARY KEY,
  impression_count bigint NOT NULL DEFAULT 0 CHECK (impression_count >= 0),
  click_count bigint NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS configuration_votes (
  configuration_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (configuration_key, user_id)
);
CREATE INDEX IF NOT EXISTS configuration_votes_user_idx ON configuration_votes(user_id);

CREATE TABLE IF NOT EXISTS configuration_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS configuration_comments_key_created_idx
  ON configuration_comments(configuration_key, created_at DESC);
CREATE INDEX IF NOT EXISTS configuration_comments_user_idx ON configuration_comments(user_id);
