CREATE TABLE IF NOT EXISTS published_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id uuid NOT NULL,
  author_name varchar(40) NOT NULL,
  name varchar(80) NOT NULL,
  configuration_class varchar(32) NOT NULL,
  description varchar(200) NOT NULL DEFAULT '',
  selected_part_ids jsonb NOT NULL,
  parts_snapshot jsonb NOT NULL,
  checks_snapshot jsonb NOT NULL,
  summary_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS published_configurations_created_idx
  ON published_configurations(created_at DESC);

CREATE INDEX IF NOT EXISTS published_configurations_class_idx
  ON published_configurations(configuration_class, created_at DESC);
