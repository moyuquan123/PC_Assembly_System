CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN CREATE TYPE part_status AS ENUM ('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE admin_status AS ENUM ('active', 'disabled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE check_level AS ENUM ('compatible', 'warning', 'incompatible'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS part_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(32) NOT NULL UNIQUE,
  name varchar(80) NOT NULL, sort_order integer NOT NULL
);
CREATE TABLE IF NOT EXISTS parts (
  id varchar(100) PRIMARY KEY, category_id uuid NOT NULL REFERENCES part_categories(id),
  brand varchar(100) NOT NULL, model varchar(160) NOT NULL, name varchar(240) NOT NULL,
  price_fen integer NOT NULL CHECK (price_fen >= 0), image_key text NOT NULL DEFAULT '',
  status part_status NOT NULL DEFAULT 'active', display_specs jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parts_category_status_idx ON parts(category_id, status);
CREATE INDEX IF NOT EXISTS parts_brand_idx ON parts(brand);
CREATE INDEX IF NOT EXISTS parts_price_idx ON parts(price_fen);

CREATE TABLE IF NOT EXISTS cpu_specs (part_id varchar(100) PRIMARY KEY REFERENCES parts(id), socket varchar(40) NOT NULL, chipset_families jsonb NOT NULL, tdp_w integer NOT NULL, max_power_w integer NOT NULL, generation varchar(80) NOT NULL);
CREATE TABLE IF NOT EXISTS motherboard_specs (part_id varchar(100) PRIMARY KEY REFERENCES parts(id), socket varchar(40) NOT NULL, chipset varchar(40) NOT NULL, memory_type varchar(16) NOT NULL, form_factor varchar(16) NOT NULL, bios_review_generations jsonb NOT NULL DEFAULT '[]', power_w integer NOT NULL);
CREATE TABLE IF NOT EXISTS memory_specs (part_id varchar(100) PRIMARY KEY REFERENCES parts(id), memory_type varchar(16) NOT NULL, capacity_mb integer NOT NULL, module_count integer NOT NULL, power_w integer NOT NULL);
CREATE TABLE IF NOT EXISTS gpu_specs (part_id varchar(100) PRIMARY KEY REFERENCES parts(id), length_mm integer NOT NULL, power_w integer NOT NULL);
CREATE TABLE IF NOT EXISTS case_specs (part_id varchar(100) PRIMARY KEY REFERENCES parts(id), supported_form_factors jsonb NOT NULL, max_gpu_length_mm integer NOT NULL, max_cooler_height_mm integer NOT NULL);
CREATE TABLE IF NOT EXISTS cooler_specs (part_id varchar(100) PRIMARY KEY REFERENCES parts(id), height_mm integer NOT NULL, supported_sockets jsonb NOT NULL, power_w integer NOT NULL);
CREATE TABLE IF NOT EXISTS psu_specs (part_id varchar(100) PRIMARY KEY REFERENCES parts(id), rated_power_w integer NOT NULL, efficiency varchar(80) NOT NULL, modular varchar(40) NOT NULL);
CREATE TABLE IF NOT EXISTS storage_specs (part_id varchar(100) PRIMARY KEY REFERENCES parts(id), interface varchar(80) NOT NULL, capacity_gb integer NOT NULL, power_w integer NOT NULL);

CREATE TABLE IF NOT EXISTS builds (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), share_code_hash varchar(64) NOT NULL UNIQUE, name varchar(120) NOT NULL, budget_fen integer NOT NULL, usage varchar(32) NOT NULL, rule_version varchar(32) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS build_items (build_id uuid NOT NULL REFERENCES builds(id), category_code varchar(32) NOT NULL, part_id varchar(100) NOT NULL REFERENCES parts(id), price_snapshot_fen integer NOT NULL, part_snapshot jsonb NOT NULL, PRIMARY KEY(build_id, category_code));
CREATE TABLE IF NOT EXISTS build_check_results (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), build_id uuid NOT NULL REFERENCES builds(id), rule_id varchar(100) NOT NULL, level check_level NOT NULL, message text NOT NULL, details jsonb);
CREATE INDEX IF NOT EXISTS build_checks_build_idx ON build_check_results(build_id);

CREATE TABLE IF NOT EXISTS admin_users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username varchar(80) NOT NULL UNIQUE, password_hash text NOT NULL, status admin_status NOT NULL DEFAULT 'active');
CREATE TABLE IF NOT EXISTS admin_sessions (id_hash varchar(64) PRIMARY KEY, admin_user_id uuid NOT NULL REFERENCES admin_users(id), expires_at timestamptz NOT NULL, last_seen_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES admin_users(id), action varchar(80) NOT NULL, target_type varchar(80) NOT NULL, target_id varchar(100) NOT NULL, changes jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS analytics_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_name varchar(80) NOT NULL, anonymous_id uuid NOT NULL, build_id uuid, properties jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS analytics_events_name_created_idx ON analytics_events(event_name, created_at);
