import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { schema } from "./schema.js";

const migration = readFileSync(fileURLToPath(new URL("../migrations/0000_initial.sql", import.meta.url)), "utf8");
const publishedConfigurationsMigration = readFileSync(fileURLToPath(new URL("../migrations/0001_published_configurations.sql", import.meta.url)), "utf8");
const communityMigration = readFileSync(fileURLToPath(new URL("../migrations/0002_community.sql", import.meta.url)), "utf8");
const personalCatalogMigration = readFileSync(fileURLToPath(new URL("../migrations/0003_personal_catalog_sync.sql", import.meta.url)), "utf8");

describe("initial PostgreSQL migration", () => {
  it.each(["part_categories", "parts", "cpu_specs", "motherboard_specs", "memory_specs", "gpu_specs", "case_specs", "cooler_specs", "psu_specs", "storage_specs", "builds", "build_items", "build_check_results", "admin_users", "admin_sessions", "audit_logs", "analytics_events"])("creates %s", (table) => {
    expect(migration).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  });

  it("uses integer cents and hashed public/session identifiers", () => {
    expect(migration).toContain("price_fen integer");
    expect(migration).toContain("share_code_hash varchar(64)");
    expect(migration).toContain("id_hash varchar(64)");
  });

  it("adds persistent user-submitted configurations without exposing anonymous identifiers", () => {
    expect(publishedConfigurationsMigration).toContain("CREATE TABLE IF NOT EXISTS published_configurations");
    expect(publishedConfigurationsMigration).toContain("anonymous_id uuid NOT NULL");
    expect(publishedConfigurationsMigration).toContain("parts_snapshot jsonb NOT NULL");
  });

  it.each(["user_accounts", "user_sessions", "configuration_engagement", "configuration_votes", "configuration_comments"])("creates community table %s", (table) => {
    expect(communityMigration).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  });

  it("enforces one vote per user and indexes community foreign keys", () => {
    expect(communityMigration).toContain("PRIMARY KEY (configuration_key, user_id)");
    expect(communityMigration).toContain("CHECK (value IN (-1, 1))");
    expect(communityMigration).toContain("configuration_comments_key_created_idx");
    expect(communityMigration).toContain("user_sessions_user_idx");
    expect(communityMigration).toContain("published_configurations_owner_idx");
  });

  it.each(["catalog_sources", "catalog_sync_runs", "part_market_offers", "catalog_sync_candidates"])("creates live catalog table %s", (table) => {
    expect(personalCatalogMigration).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  });

  it("extends profiles and indexes live catalog access paths", () => {
    expect(personalCatalogMigration).toContain("ADD COLUMN IF NOT EXISTS bio");
    expect(personalCatalogMigration).toContain("ADD COLUMN IF NOT EXISTS location");
    expect(personalCatalogMigration).toContain("part_market_offers_part_fetched_idx");
    expect(personalCatalogMigration).toContain("catalog_sync_candidates_status_category_idx");
    expect(personalCatalogMigration).toContain("UNIQUE (source_code, external_id)");
  });

  it("exports community, profile and catalog sync tables through the Drizzle schema", () => {
    expect(schema).toMatchObject({
      userAccounts: expect.any(Object),
      userSessions: expect.any(Object),
      configurationEngagement: expect.any(Object),
      configurationVotes: expect.any(Object),
      configurationComments: expect.any(Object),
      catalogSources: expect.any(Object),
      catalogSyncRuns: expect.any(Object),
      partMarketOffers: expect.any(Object),
      catalogSyncCandidates: expect.any(Object)
    });
  });
});
