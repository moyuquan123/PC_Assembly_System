import { randomUUID } from "node:crypto";
import type {
  AnalyticsEventInput,
  BuildInput,
  PartsQuery,
  AdminPartCreate,
  AdminPartPatch
} from "@pc-assembly/contracts";
import type { PublishedConfigurationInput } from "@pc-assembly/contracts";
import type { UserRegistration } from "@pc-assembly/contracts";
import { seedParts } from "@pc-assembly/domain";
import type { BuildSummary, CompatibilityResult, Part } from "@pc-assembly/domain";
import { calculateEngagementMetrics } from "./engagement-ranking.js";

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

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  status: "active" | "disabled";
  createdAt: string;
}

export interface UserSession {
  idHash: string;
  userId: string;
  expiresAt: Date;
}

export interface ConfigurationComment {
  id: string;
  configurationKey: string;
  author: { id: string; displayName: string };
  content: string;
  createdAt: string;
}

export interface ConfigurationEngagement {
  configurationKey: string;
  recommendCount: number;
  notRecommendCount: number;
  commentCount: number;
  impressionCount: number;
  clickCount: number;
  clickRate: number;
  hybridScore: number;
  myVote: -1 | 0 | 1;
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

export interface PublishedConfiguration {
  id: string;
  ownerUserId: string | null;
  authorName: string;
  name: string;
  configurationClass: PublishedConfigurationInput["configurationClass"];
  description: string;
  createdAt: string;
  selectedPartIds: PublishedConfigurationInput["selectedPartIds"];
  parts: Part[];
  checks: CompatibilityResult[];
  summary: BuildSummary;
}

export interface Store {
  listParts(query: PartsQuery, includeInactive?: boolean): Promise<Part[]>;
  getPart(id: string, includeInactive?: boolean): Promise<Part | undefined>;
  createPart(part: AdminPartCreate): Promise<Part>;
  updatePart(id: string, patch: AdminPartPatch): Promise<Part | undefined>;
  saveBuild(shareCodeHash: string, input: BuildInput, parts: Part[], checks: CompatibilityResult[], ruleVersion: string): Promise<StoredBuild>;
  getBuildByShareHash(shareCodeHash: string): Promise<StoredBuild | undefined>;
  listPublishedConfigurations(): Promise<PublishedConfiguration[]>;
  getPublishedConfiguration(id: string): Promise<PublishedConfiguration | undefined>;
  savePublishedConfiguration(input: PublishedConfigurationInput, owner: UserAccount, parts: Part[], checks: CompatibilityResult[], summary: BuildSummary): Promise<PublishedConfiguration>;
  getUserByUsername(username: string): Promise<UserAccount | undefined>;
  getUserById(id: string): Promise<UserAccount | undefined>;
  createUser(input: UserRegistration, passwordHash: string): Promise<UserAccount>;
  createUserSession(session: UserSession): Promise<void>;
  getUserSession(idHash: string): Promise<UserSession | undefined>;
  deleteUserSession(idHash: string): Promise<void>;
  listConfigurationEngagement(keys: string[], userId?: string): Promise<ConfigurationEngagement[]>;
  addConfigurationImpressions(keys: string[]): Promise<void>;
  addConfigurationClick(key: string): Promise<void>;
  setConfigurationVote(key: string, userId: string, value: -1 | 0 | 1): Promise<void>;
  listConfigurationComments(key: string): Promise<ConfigurationComment[]>;
  addConfigurationComment(key: string, user: UserAccount, content: string): Promise<ConfigurationComment>;
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
  private readonly publishedConfigurations = new Map<string, PublishedConfiguration>();
  private readonly users = new Map<string, AdminUser>();
  private readonly sessions = new Map<string, AdminSession>();
  private readonly userAccounts = new Map<string, UserAccount>();
  private readonly userSessions = new Map<string, UserSession>();
  private readonly engagement = new Map<string, { impressions: number; clicks: number }>();
  private readonly votes = new Map<string, -1 | 1>();
  private readonly comments: ConfigurationComment[] = [];
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

  async listPublishedConfigurations(): Promise<PublishedConfiguration[]> {
    return [...this.publishedConfigurations.values()]
      .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((configuration) => structuredClone(configuration));
  }

  async getPublishedConfiguration(id: string): Promise<PublishedConfiguration | undefined> {
    const configuration = this.publishedConfigurations.get(id);
    return configuration ? structuredClone(configuration) : undefined;
  }

  async savePublishedConfiguration(input: PublishedConfigurationInput, owner: UserAccount, parts: Part[], checks: CompatibilityResult[], summary: BuildSummary): Promise<PublishedConfiguration> {
    const configuration: PublishedConfiguration = {
      id: randomUUID(),
      ownerUserId: owner.id,
      authorName: owner.displayName,
      name: input.name,
      configurationClass: input.configurationClass,
      description: input.description,
      createdAt: new Date().toISOString(),
      selectedPartIds: structuredClone(input.selectedPartIds),
      parts: structuredClone(parts),
      checks: structuredClone(checks),
      summary: structuredClone(summary)
    };
    this.publishedConfigurations.set(configuration.id, configuration);
    return structuredClone(configuration);
  }

  async getUserByUsername(username: string): Promise<UserAccount | undefined> {
    return [...this.userAccounts.values()].find((user) => user.username === username);
  }
  async getUserById(id: string): Promise<UserAccount | undefined> { return this.userAccounts.get(id); }
  async createUser(input: UserRegistration, passwordHash: string): Promise<UserAccount> {
    if (await this.getUserByUsername(input.username)) throw new Error("USER_EXISTS");
    const user: UserAccount = { id: randomUUID(), username: input.username, displayName: input.displayName, passwordHash, status: "active", createdAt: new Date().toISOString() };
    this.userAccounts.set(user.id, user);
    return structuredClone(user);
  }
  async createUserSession(session: UserSession): Promise<void> { this.userSessions.set(session.idHash, session); }
  async getUserSession(idHash: string): Promise<UserSession | undefined> {
    const session = this.userSessions.get(idHash);
    if (session && session.expiresAt > new Date()) return session;
    if (session) this.userSessions.delete(idHash);
    return undefined;
  }
  async deleteUserSession(idHash: string): Promise<void> { this.userSessions.delete(idHash); }
  async listConfigurationEngagement(keys: string[], userId?: string): Promise<ConfigurationEngagement[]> {
    return keys.map((configurationKey) => {
      const counts = this.engagement.get(configurationKey) ?? { impressions: 0, clicks: 0 };
      const keyVotes = [...this.votes.entries()].filter(([key]) => key.startsWith(`${configurationKey}|`)).map(([, value]) => value);
      const recommendCount = keyVotes.filter((value) => value === 1).length;
      const notRecommendCount = keyVotes.filter((value) => value === -1).length;
      const commentCount = this.comments.filter((comment) => comment.configurationKey === configurationKey).length;
      return { configurationKey, ...calculateEngagementMetrics({ recommendCount, notRecommendCount, commentCount, impressionCount: counts.impressions, clickCount: counts.clicks }), myVote: userId ? this.votes.get(`${configurationKey}|${userId}`) ?? 0 : 0 };
    });
  }
  async addConfigurationImpressions(keys: string[]): Promise<void> {
    for (const key of new Set(keys)) { const current = this.engagement.get(key) ?? { impressions: 0, clicks: 0 }; this.engagement.set(key, { ...current, impressions: current.impressions + 1 }); }
  }
  async addConfigurationClick(key: string): Promise<void> { const current = this.engagement.get(key) ?? { impressions: 0, clicks: 0 }; this.engagement.set(key, { ...current, clicks: current.clicks + 1 }); }
  async setConfigurationVote(key: string, userId: string, value: -1 | 0 | 1): Promise<void> { const voteKey = `${key}|${userId}`; if (value === 0) this.votes.delete(voteKey); else this.votes.set(voteKey, value); }
  async listConfigurationComments(key: string): Promise<ConfigurationComment[]> { return this.comments.filter((comment) => comment.configurationKey === key).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)).map((comment) => structuredClone(comment)); }
  async addConfigurationComment(key: string, user: UserAccount, content: string): Promise<ConfigurationComment> { const comment = { id: randomUUID(), configurationKey: key, author: { id: user.id, displayName: user.displayName }, content, createdAt: new Date().toISOString() }; this.comments.push(comment); return structuredClone(comment); }

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
