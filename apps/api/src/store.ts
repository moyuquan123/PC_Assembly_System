import { randomUUID } from "node:crypto";
import type {
  AnalyticsEventInput,
  BuildInput,
  PartsQuery,
  AdminPartCreate,
  AdminPartPatch
} from "@pc-assembly/contracts";
import { seedParts } from "@pc-assembly/domain";
import type { CompatibilityResult, Part } from "@pc-assembly/domain";

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  status: "active" | "disabled";
}

export interface AdminSession {
  idHash: string;
  adminUserId: string;
  expiresAt: Date;
}

export interface StoredBuild {
  id: string;
  name: string;
  budgetFen: number;
  usage: BuildInput["usage"];
  ruleVersion: string;
  createdAt: string;
  parts: Part[];
  checks: CompatibilityResult[];
}

export interface Store {
  listParts(query: PartsQuery, includeInactive?: boolean): Promise<Part[]>;
  getPart(id: string, includeInactive?: boolean): Promise<Part | undefined>;
  createPart(part: AdminPartCreate): Promise<Part>;
  updatePart(id: string, patch: AdminPartPatch): Promise<Part | undefined>;
  saveBuild(shareCodeHash: string, input: BuildInput, parts: Part[], checks: CompatibilityResult[], ruleVersion: string): Promise<StoredBuild>;
  getBuildByShareHash(shareCodeHash: string): Promise<StoredBuild | undefined>;
  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  getAdminById(id: string): Promise<AdminUser | undefined>;
  upsertAdmin(username: string, passwordHash: string): Promise<AdminUser>;
  createSession(session: AdminSession): Promise<void>;
  getSession(idHash: string): Promise<AdminSession | undefined>;
  deleteSession(idHash: string): Promise<void>;
  addAudit(actorId: string, action: string, targetId: string, changes: Record<string, unknown>): Promise<void>;
  addEvent(event: AnalyticsEventInput): Promise<void>;
  ready(): Promise<boolean>;
  close(): Promise<void>;
}

export class MemoryStore implements Store {
  private readonly parts = new Map(seedParts.map((part) => [part.id, structuredClone(part)]));
  private readonly builds = new Map<string, StoredBuild>();
  private readonly users = new Map<string, AdminUser>();
  private readonly sessions = new Map<string, AdminSession>();
  readonly audits: Array<Record<string, unknown>> = [];
  readonly events: AnalyticsEventInput[] = [];

  async listParts(query: PartsQuery, includeInactive = false): Promise<Part[]> {
    const keyword = query.keyword?.toLocaleLowerCase("zh-CN");
    return [...this.parts.values()].filter((part) => {
      if (!includeInactive && part.status !== "active") return false;
      if (query.category && part.category !== query.category) return false;
      if (query.brand && part.brand !== query.brand) return false;
      if (query.minPriceFen !== undefined && part.priceFen < query.minPriceFen) return false;
      if (query.maxPriceFen !== undefined && part.priceFen > query.maxPriceFen) return false;
      if (keyword && !`${part.brand} ${part.model} ${part.name}`.toLocaleLowerCase("zh-CN").includes(keyword)) return false;
      return true;
    }).toSorted((a, b) => a.priceFen - b.priceFen || a.name.localeCompare(b.name, "zh-CN"));
  }

  async getPart(id: string, includeInactive = false): Promise<Part | undefined> {
    const part = this.parts.get(id);
    if (!part || (!includeInactive && part.status !== "active")) return undefined;
    return structuredClone(part);
  }

  async createPart(input: AdminPartCreate): Promise<Part> {
    if (this.parts.has(input.id)) throw new Error("PART_ID_EXISTS");
    const part = { ...structuredClone(input), updatedAt: new Date().toISOString() } as Part;
    this.parts.set(part.id, part);
    return structuredClone(part);
  }

  async updatePart(id: string, patch: AdminPartPatch): Promise<Part | undefined> {
    const current = this.parts.get(id);
    if (!current) return undefined;
    const next = { ...current, ...structuredClone(patch), id, updatedAt: new Date().toISOString() } as Part;
    this.parts.set(id, next);
    return structuredClone(next);
  }

  async saveBuild(shareCodeHash: string, input: BuildInput, parts: Part[], checks: CompatibilityResult[], ruleVersion: string): Promise<StoredBuild> {
    const stored: StoredBuild = {
      id: randomUUID(), name: input.name, budgetFen: input.budgetFen, usage: input.usage,
      ruleVersion, createdAt: new Date().toISOString(), parts: structuredClone(parts), checks: structuredClone(checks)
    };
    this.builds.set(shareCodeHash, stored);
    return structuredClone(stored);
  }

  async getBuildByShareHash(shareCodeHash: string): Promise<StoredBuild | undefined> {
    const found = this.builds.get(shareCodeHash);
    return found ? structuredClone(found) : undefined;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    return [...this.users.values()].find((user) => user.username === username);
  }

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    return this.users.get(id);
  }

  async upsertAdmin(username: string, passwordHash: string): Promise<AdminUser> {
    const existing = await this.getAdminByUsername(username);
    const user: AdminUser = existing
      ? { ...existing, passwordHash, status: "active" }
      : { id: randomUUID(), username, passwordHash, status: "active" };
    this.users.set(user.id, user);
    return user;
  }

  async createSession(session: AdminSession): Promise<void> { this.sessions.set(session.idHash, session); }
  async getSession(idHash: string): Promise<AdminSession | undefined> {
    const session = this.sessions.get(idHash);
    if (session && session.expiresAt > new Date()) return session;
    if (session) this.sessions.delete(idHash);
    return undefined;
  }
  async deleteSession(idHash: string): Promise<void> { this.sessions.delete(idHash); }
  async addAudit(actorId: string, action: string, targetId: string, changes: Record<string, unknown>): Promise<void> {
    this.audits.push({ actorId, action, targetId, changes, createdAt: new Date().toISOString() });
  }
  async addEvent(event: AnalyticsEventInput): Promise<void> { this.events.push(structuredClone(event)); }
  async ready(): Promise<boolean> { return true; }
  async close(): Promise<void> {}
}
