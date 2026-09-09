import type { AnalyticsEventInput, BuildInput, PartsQuery, AdminPartCreate, AdminPartPatch, PublishedConfigurationInput } from "@pc-assembly/contracts";
import type { BuildSummary, CompatibilityResult, Part, PartSpecs } from "@pc-assembly/domain";
import postgres from "postgres";
import type { Sql } from "postgres";
import type { AdminSession, AdminUser, PublishedConfiguration, Store, StoredBuild } from "./store.js";

interface BasePartRow {
  id: string; category: Part["category"]; brand: string; model: string; name: string;
  priceFen: number; imageUrl: string; status: Part["status"]; displaySpecs: string[]; updatedAt: Date;
}

export class PostgresStore implements Store {
  private readonly sql: Sql;
  constructor(databaseUrl: string) { this.sql = postgres(databaseUrl, { max: 10, prepare: false }); }

  async listParts(query: PartsQuery, includeInactive = false): Promise<Part[]> {
    const rows = await this.sql<BasePartRow[]>`
      SELECT p.id, c.code AS category, p.brand, p.model, p.name,
             p.price_fen AS "priceFen", p.image_key AS "imageUrl", p.status,
             p.display_specs AS "displaySpecs", p.updated_at AS "updatedAt"
      FROM parts p JOIN part_categories c ON c.id = p.category_id
      ORDER BY p.price_fen, p.name
    `;
    const keyword = query.keyword?.toLocaleLowerCase("zh-CN");
    const filtered = rows.filter((row) => {
      if (!includeInactive && row.status !== "active") return false;
      if (query.category && row.category !== query.category) return false;
      if (query.brand && row.brand !== query.brand) return false;
      if (query.minPriceFen !== undefined && row.priceFen < query.minPriceFen) return false;
      if (query.maxPriceFen !== undefined && row.priceFen > query.maxPriceFen) return false;
      return !keyword || `${row.brand} ${row.model} ${row.name}`.toLocaleLowerCase("zh-CN").includes(keyword);
    });
    return Promise.all(filtered.map((row) => this.hydratePart(row)));
  }

  async getPart(id: string, includeInactive = false): Promise<Part | undefined> {
    const [row] = await this.sql<BasePartRow[]>`
      SELECT p.id, c.code AS category, p.brand, p.model, p.name,
             p.price_fen AS "priceFen", p.image_key AS "imageUrl", p.status,
             p.display_specs AS "displaySpecs", p.updated_at AS "updatedAt"
      FROM parts p JOIN part_categories c ON c.id = p.category_id WHERE p.id = ${id}
    `;
    if (!row || (!includeInactive && row.status !== "active")) return undefined;
    return this.hydratePart(row);
  }

  private async hydratePart(row: BasePartRow): Promise<Part> {
    const specs = await this.loadSpecs(row.category, row.id);
    return { ...row, updatedAt: new Date(row.updatedAt).toISOString(), specs };
  }

  private async loadSpecs(category: Part["category"], id: string): Promise<PartSpecs> {
    if (category === "cpu") { const [r] = await this.sql<any[]>`SELECT socket, chipset_families AS "chipsetFamilies", tdp_w AS "tdpW", max_power_w AS "maxPowerW", generation FROM cpu_specs WHERE part_id=${id}`; return { kind: "cpu", ...r }; }
    if (category === "motherboard") { const [r] = await this.sql<any[]>`SELECT socket, chipset, memory_type AS "memoryType", form_factor AS "formFactor", bios_review_generations AS "biosReviewGenerations", power_w AS "powerW" FROM motherboard_specs WHERE part_id=${id}`; return { kind: "motherboard", ...r }; }
    if (category === "memory") { const [r] = await this.sql<any[]>`SELECT memory_type AS "memoryType", capacity_mb AS "capacityMb", module_count AS "moduleCount", power_w AS "powerW" FROM memory_specs WHERE part_id=${id}`; return { kind: "memory", ...r }; }
    if (category === "gpu") { const [r] = await this.sql<any[]>`SELECT length_mm AS "lengthMm", power_w AS "powerW" FROM gpu_specs WHERE part_id=${id}`; return { kind: "gpu", ...r }; }
    if (category === "case") { const [r] = await this.sql<any[]>`SELECT supported_form_factors AS "supportedFormFactors", max_gpu_length_mm AS "maxGpuLengthMm", max_cooler_height_mm AS "maxCoolerHeightMm" FROM case_specs WHERE part_id=${id}`; return { kind: "case", ...r }; }
    if (category === "cooler") { const [r] = await this.sql<any[]>`SELECT height_mm AS "heightMm", supported_sockets AS "supportedSockets", power_w AS "powerW" FROM cooler_specs WHERE part_id=${id}`; return { kind: "cooler", ...r }; }
    if (category === "psu") { const [r] = await this.sql<any[]>`SELECT rated_power_w AS "ratedPowerW", efficiency, modular FROM psu_specs WHERE part_id=${id}`; return { kind: "psu", ...r }; }
    const [r] = await this.sql<any[]>`SELECT interface, capacity_gb AS "capacityGb", power_w AS "powerW" FROM storage_specs WHERE part_id=${id}`;
    return { kind: "storage", ...r };
  }

  async createPart(input: AdminPartCreate): Promise<Part> {
    const exists = await this.getPart(input.id, true);
    if (exists) throw new Error("PART_ID_EXISTS");
    await this.sql.begin(async (tx) => {
      const [category] = await tx<{ id: string }[]>`SELECT id FROM part_categories WHERE code=${input.category}`;
      if (!category) throw new Error("CATEGORY_NOT_FOUND");
      await tx`INSERT INTO parts (id,category_id,brand,model,name,price_fen,image_key,status,display_specs) VALUES (${input.id},${category.id},${input.brand},${input.model},${input.name},${input.priceFen},${input.imageUrl},${input.status},${tx.json(input.displaySpecs)})`;
      await insertSpecs(tx, input as Part);
    });
    return (await this.getPart(input.id, true))!;
  }

  async updatePart(id: string, patch: AdminPartPatch): Promise<Part | undefined> {
    const current = await this.getPart(id, true);
    if (!current) return undefined;
    const next = { ...current, ...patch, id, updatedAt: new Date().toISOString() } as Part;
    await this.sql.begin(async (tx) => {
      const [category] = await tx<{ id: string }[]>`SELECT id FROM part_categories WHERE code=${next.category}`;
      if (!category) throw new Error("CATEGORY_NOT_FOUND");
      await tx`UPDATE parts SET category_id=${category.id}, brand=${next.brand}, model=${next.model}, name=${next.name}, price_fen=${next.priceFen}, image_key=${next.imageUrl}, status=${next.status}, display_specs=${tx.json(next.displaySpecs)}, updated_at=now() WHERE id=${id}`;
      await tx`DELETE FROM cpu_specs WHERE part_id=${id}`;
      await tx`DELETE FROM motherboard_specs WHERE part_id=${id}`;
      await tx`DELETE FROM memory_specs WHERE part_id=${id}`;
      await tx`DELETE FROM gpu_specs WHERE part_id=${id}`;
      await tx`DELETE FROM case_specs WHERE part_id=${id}`;
      await tx`DELETE FROM cooler_specs WHERE part_id=${id}`;
      await tx`DELETE FROM psu_specs WHERE part_id=${id}`;
      await tx`DELETE FROM storage_specs WHERE part_id=${id}`;
      await insertSpecs(tx, next);
    });
    return this.getPart(id, true);
  }

  async saveBuild(shareCodeHash: string, input: BuildInput, parts: Part[], checks: CompatibilityResult[], ruleVersion: string): Promise<StoredBuild> {
    const stored = await this.sql.begin(async (tx) => {
      const [build] = await tx<{ id: string; createdAt: Date }[]>`INSERT INTO builds (share_code_hash,name,budget_fen,usage,rule_version) VALUES (${shareCodeHash},${input.name},${input.budgetFen},${input.usage},${ruleVersion}) RETURNING id, created_at AS "createdAt"`;
      if (!build) throw new Error("BUILD_INSERT_FAILED");
      for (const part of parts) await tx`INSERT INTO build_items (build_id,category_code,part_id,price_snapshot_fen,part_snapshot) VALUES (${build.id},${part.category},${part.id},${part.priceFen},${tx.json(part as any)})`;
      for (const check of checks) await tx`INSERT INTO build_check_results (build_id,rule_id,level,message,details) VALUES (${build.id},${check.ruleId},${check.level},${check.message},${check.details ? tx.json(check.details as any) : null})`;
      return { id: build.id, name: input.name, budgetFen: input.budgetFen, usage: input.usage, ruleVersion, createdAt: new Date(build.createdAt).toISOString(), parts, checks } satisfies StoredBuild;
    });
    return stored;
  }

  async getBuildByShareHash(shareCodeHash: string): Promise<StoredBuild | undefined> {
    const [build] = await this.sql<any[]>`SELECT id,name,budget_fen AS "budgetFen",usage,rule_version AS "ruleVersion",created_at AS "createdAt" FROM builds WHERE share_code_hash=${shareCodeHash}`;
    if (!build) return undefined;
    const items = await this.sql<{ partSnapshot: Part }[]>`SELECT part_snapshot AS "partSnapshot" FROM build_items WHERE build_id=${build.id} ORDER BY category_code`;
    const checks = await this.sql<any[]>`SELECT rule_id AS "ruleId", level, message, details FROM build_check_results WHERE build_id=${build.id} ORDER BY CASE level WHEN 'incompatible' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, rule_id`;
    return { ...build, createdAt: new Date(build.createdAt).toISOString(), parts: items.map((item) => item.partSnapshot), checks } as StoredBuild;
  }

  async listPublishedConfigurations(): Promise<PublishedConfiguration[]> {
    const rows = await this.sql<any[]>`
      SELECT id, author_name AS "authorName", name,
             configuration_class AS "configurationClass", description,
             selected_part_ids AS "selectedPartIds", parts_snapshot AS parts,
             checks_snapshot AS checks, summary_snapshot AS summary,
             created_at AS "createdAt"
      FROM published_configurations
      ORDER BY created_at DESC
      LIMIT 200
    `;
    return rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt).toISOString() })) as PublishedConfiguration[];
  }

  async savePublishedConfiguration(input: PublishedConfigurationInput, parts: Part[], checks: CompatibilityResult[], summary: BuildSummary): Promise<PublishedConfiguration> {
    const [row] = await this.sql<any[]>`
      INSERT INTO published_configurations
        (anonymous_id, author_name, name, configuration_class, description, selected_part_ids, parts_snapshot, checks_snapshot, summary_snapshot)
      VALUES
        (${input.anonymousId}, ${input.authorName}, ${input.name}, ${input.configurationClass}, ${input.description},
         ${this.sql.json(input.selectedPartIds)}, ${this.sql.json(parts as any)}, ${this.sql.json(checks as any)}, ${this.sql.json(summary as any)})
      RETURNING id, author_name AS "authorName", name,
                configuration_class AS "configurationClass", description,
                selected_part_ids AS "selectedPartIds", parts_snapshot AS parts,
                checks_snapshot AS checks, summary_snapshot AS summary,
                created_at AS "createdAt"
    `;
    if (!row) throw new Error("CONFIGURATION_INSERT_FAILED");
    return { ...row, createdAt: new Date(row.createdAt).toISOString() } as PublishedConfiguration;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | undefined> { const [u] = await this.sql<any[]>`SELECT id,username,password_hash AS "passwordHash",status FROM admin_users WHERE username=${username}`; return u; }
  async getAdminById(id: string): Promise<AdminUser | undefined> { const [u] = await this.sql<any[]>`SELECT id,username,password_hash AS "passwordHash",status FROM admin_users WHERE id=${id}`; return u; }
  async upsertAdmin(username: string, passwordHash: string): Promise<AdminUser> {
    const [u] = await this.sql<any[]>`INSERT INTO admin_users (username,password_hash,status) VALUES (${username},${passwordHash},'active') ON CONFLICT (username) DO UPDATE SET password_hash=EXCLUDED.password_hash,status='active' RETURNING id,username,password_hash AS "passwordHash",status`;
    return u;
  }
  async createSession(session: AdminSession): Promise<void> { await this.sql`INSERT INTO admin_sessions (id_hash,admin_user_id,expires_at) VALUES (${session.idHash},${session.adminUserId},${session.expiresAt})`; }
  async getSession(idHash: string): Promise<AdminSession | undefined> { const [s] = await this.sql<any[]>`SELECT id_hash AS "idHash",admin_user_id AS "adminUserId",expires_at AS "expiresAt" FROM admin_sessions WHERE id_hash=${idHash} AND expires_at>now()`; return s; }
  async deleteSession(idHash: string): Promise<void> { await this.sql`DELETE FROM admin_sessions WHERE id_hash=${idHash}`; }
  async addAudit(actorId: string, action: string, targetId: string, changes: Record<string, unknown>): Promise<void> { await this.sql`INSERT INTO audit_logs (actor_id,action,target_type,target_id,changes) VALUES (${actorId},${action},'part',${targetId},${this.sql.json(changes as any)})`; }
  async addEvent(event: AnalyticsEventInput): Promise<void> { await this.sql`INSERT INTO analytics_events (event_name,anonymous_id,build_id,properties) VALUES (${event.eventName},${event.anonymousId},${event.buildId ?? null},${this.sql.json(event.properties)})`; }
  async ready(): Promise<boolean> { try { await this.sql`SELECT 1`; return true; } catch { return false; } }
  async close(): Promise<void> { await this.sql.end(); }
}

async function insertSpecs(tx: any, part: Part): Promise<void> {
  const s = part.specs;
  if (s.kind === "cpu") await tx`INSERT INTO cpu_specs VALUES (${part.id},${s.socket},${tx.json(s.chipsetFamilies)},${s.tdpW},${s.maxPowerW},${s.generation})`;
  else if (s.kind === "motherboard") await tx`INSERT INTO motherboard_specs VALUES (${part.id},${s.socket},${s.chipset},${s.memoryType},${s.formFactor},${tx.json(s.biosReviewGenerations)},${s.powerW})`;
  else if (s.kind === "memory") await tx`INSERT INTO memory_specs VALUES (${part.id},${s.memoryType},${s.capacityMb},${s.moduleCount},${s.powerW})`;
  else if (s.kind === "gpu") await tx`INSERT INTO gpu_specs VALUES (${part.id},${s.lengthMm},${s.powerW})`;
  else if (s.kind === "case") await tx`INSERT INTO case_specs VALUES (${part.id},${tx.json(s.supportedFormFactors)},${s.maxGpuLengthMm},${s.maxCoolerHeightMm})`;
  else if (s.kind === "cooler") await tx`INSERT INTO cooler_specs VALUES (${part.id},${s.heightMm},${tx.json(s.supportedSockets)},${s.powerW})`;
  else if (s.kind === "psu") await tx`INSERT INTO psu_specs VALUES (${part.id},${s.ratedPowerW},${s.efficiency},${s.modular})`;
  else await tx`INSERT INTO storage_specs VALUES (${part.id},${s.interface},${s.capacityGb},${s.powerW})`;
}
