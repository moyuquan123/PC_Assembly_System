import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(fileURLToPath(new URL("../migrations/0000_initial.sql", import.meta.url)), "utf8");

describe("initial PostgreSQL migration", () => {
  it.each(["part_categories", "parts", "cpu_specs", "motherboard_specs", "memory_specs", "gpu_specs", "case_specs", "cooler_specs", "psu_specs", "storage_specs", "builds", "build_items", "build_check_results", "admin_users", "admin_sessions", "audit_logs", "analytics_events"])("creates %s", (table) => {
    expect(migration).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  });

  it("uses integer cents and hashed public/session identifiers", () => {
    expect(migration).toContain("price_fen integer");
    expect(migration).toContain("share_code_hash varchar(64)");
    expect(migration).toContain("id_hash varchar(64)");
  });
});
