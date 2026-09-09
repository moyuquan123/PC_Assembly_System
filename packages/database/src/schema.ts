import type { Part, CompatibilityResult } from "@pc-assembly/domain";
import { bigint, index, integer, jsonb, pgEnum, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const partStatus = pgEnum("part_status", ["active", "inactive"]);
export const adminStatus = pgEnum("admin_status", ["active", "disabled"]);
export const checkLevel = pgEnum("check_level", ["compatible", "warning", "incompatible"]);

export const partCategories = pgTable("part_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  sortOrder: integer("sort_order").notNull()
});

export const parts = pgTable("parts", {
  id: varchar("id", { length: 100 }).primaryKey(),
  categoryId: uuid("category_id").notNull().references(() => partCategories.id),
  brand: varchar("brand", { length: 100 }).notNull(),
  model: varchar("model", { length: 160 }).notNull(),
  name: varchar("name", { length: 240 }).notNull(),
  priceFen: integer("price_fen").notNull(),
  imageKey: text("image_key").notNull().default(""),
  status: partStatus("status").notNull().default("active"),
  displaySpecs: jsonb("display_specs").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("parts_category_status_idx").on(table.categoryId, table.status),
  index("parts_brand_idx").on(table.brand),
  index("parts_price_idx").on(table.priceFen)
]);

export const cpuSpecs = pgTable("cpu_specs", {
  partId: varchar("part_id", { length: 100 }).primaryKey().references(() => parts.id),
  socket: varchar("socket", { length: 40 }).notNull(),
  chipsetFamilies: jsonb("chipset_families").$type<string[]>().notNull(),
  tdpW: integer("tdp_w").notNull(), maxPowerW: integer("max_power_w").notNull(),
  generation: varchar("generation", { length: 80 }).notNull()
});
export const motherboardSpecs = pgTable("motherboard_specs", {
  partId: varchar("part_id", { length: 100 }).primaryKey().references(() => parts.id),
  socket: varchar("socket", { length: 40 }).notNull(), chipset: varchar("chipset", { length: 40 }).notNull(),
  memoryType: varchar("memory_type", { length: 16 }).notNull(), formFactor: varchar("form_factor", { length: 16 }).notNull(),
  biosReviewGenerations: jsonb("bios_review_generations").$type<string[]>().notNull().default([]), powerW: integer("power_w").notNull()
});
export const memorySpecs = pgTable("memory_specs", {
  partId: varchar("part_id", { length: 100 }).primaryKey().references(() => parts.id),
  memoryType: varchar("memory_type", { length: 16 }).notNull(), capacityMb: integer("capacity_mb").notNull(),
  moduleCount: integer("module_count").notNull(), powerW: integer("power_w").notNull()
});
export const gpuSpecs = pgTable("gpu_specs", {
  partId: varchar("part_id", { length: 100 }).primaryKey().references(() => parts.id),
  lengthMm: integer("length_mm").notNull(), powerW: integer("power_w").notNull()
});
export const caseSpecs = pgTable("case_specs", {
  partId: varchar("part_id", { length: 100 }).primaryKey().references(() => parts.id),
  supportedFormFactors: jsonb("supported_form_factors").$type<string[]>().notNull(),
  maxGpuLengthMm: integer("max_gpu_length_mm").notNull(), maxCoolerHeightMm: integer("max_cooler_height_mm").notNull()
});
export const coolerSpecs = pgTable("cooler_specs", {
  partId: varchar("part_id", { length: 100 }).primaryKey().references(() => parts.id),
  heightMm: integer("height_mm").notNull(), supportedSockets: jsonb("supported_sockets").$type<string[]>().notNull(),
  powerW: integer("power_w").notNull()
});
export const psuSpecs = pgTable("psu_specs", {
  partId: varchar("part_id", { length: 100 }).primaryKey().references(() => parts.id),
  ratedPowerW: integer("rated_power_w").notNull(), efficiency: varchar("efficiency", { length: 80 }).notNull(),
  modular: varchar("modular", { length: 40 }).notNull()
});
export const storageSpecs = pgTable("storage_specs", {
  partId: varchar("part_id", { length: 100 }).primaryKey().references(() => parts.id),
  interface: varchar("interface", { length: 80 }).notNull(), capacityGb: integer("capacity_gb").notNull(),
  powerW: integer("power_w").notNull()
});

export const builds = pgTable("builds", {
  id: uuid("id").primaryKey().defaultRandom(),
  shareCodeHash: varchar("share_code_hash", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(), budgetFen: integer("budget_fen").notNull(),
  usage: varchar("usage", { length: 32 }).notNull(), ruleVersion: varchar("rule_version", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
export const buildItems = pgTable("build_items", {
  buildId: uuid("build_id").notNull().references(() => builds.id),
  categoryCode: varchar("category_code", { length: 32 }).notNull(),
  partId: varchar("part_id", { length: 100 }).notNull().references(() => parts.id),
  priceSnapshotFen: integer("price_snapshot_fen").notNull(),
  partSnapshot: jsonb("part_snapshot").$type<Part>().notNull()
}, (table) => [primaryKey({ columns: [table.buildId, table.categoryCode] })]);
export const buildCheckResults = pgTable("build_check_results", {
  id: uuid("id").primaryKey().defaultRandom(), buildId: uuid("build_id").notNull().references(() => builds.id),
  ruleId: varchar("rule_id", { length: 100 }).notNull(), level: checkLevel("level").notNull(),
  message: text("message").notNull(), details: jsonb("details").$type<CompatibilityResult["details"]>()
}, (table) => [index("build_checks_build_idx").on(table.buildId)]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(), username: varchar("username", { length: 80 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(), status: adminStatus("status").notNull().default("active")
});
export const adminSessions = pgTable("admin_sessions", {
  idHash: varchar("id_hash", { length: 64 }).primaryKey(), adminUserId: uuid("admin_user_id").notNull().references(() => adminUsers.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("admin_sessions_expiry_idx").on(table.expiresAt)]);
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(), actorId: uuid("actor_id").notNull().references(() => adminUsers.id),
  action: varchar("action", { length: 80 }).notNull(), targetType: varchar("target_type", { length: 80 }).notNull(),
  targetId: varchar("target_id", { length: 100 }).notNull(), changes: jsonb("changes").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(), eventName: varchar("event_name", { length: 80 }).notNull(),
  anonymousId: uuid("anonymous_id").notNull(), buildId: uuid("build_id"),
  properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("analytics_events_name_created_idx").on(table.eventName, table.createdAt)]);

export const userAccounts = pgTable("user_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  location: text("location").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const publishedConfigurations = pgTable("published_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  anonymousId: uuid("anonymous_id"),
  ownerUserId: uuid("owner_user_id").references(() => userAccounts.id, { onDelete: "set null" }),
  authorName: varchar("author_name", { length: 40 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  configurationClass: varchar("configuration_class", { length: 32 }).notNull(),
  description: varchar("description", { length: 200 }).notNull().default(""),
  selectedPartIds: jsonb("selected_part_ids").$type<Record<string, string>>().notNull(),
  partsSnapshot: jsonb("parts_snapshot").$type<Part[]>().notNull(),
  checksSnapshot: jsonb("checks_snapshot").$type<CompatibilityResult[]>().notNull(),
  summarySnapshot: jsonb("summary_snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("published_configurations_created_idx").on(table.createdAt),
  index("published_configurations_class_idx").on(table.configurationClass, table.createdAt),
  index("published_configurations_owner_idx").on(table.ownerUserId, table.createdAt)
]);

export const userSessions = pgTable("user_sessions", {
  idHash: varchar("id_hash", { length: 64 }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => userAccounts.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("user_sessions_user_idx").on(table.userId), index("user_sessions_expires_idx").on(table.expiresAt)]);

export const configurationEngagement = pgTable("configuration_engagement", {
  configurationKey: text("configuration_key").primaryKey(),
  impressionCount: bigint("impression_count", { mode: "number" }).notNull().default(0),
  clickCount: bigint("click_count", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
export const configurationVotes = pgTable("configuration_votes", {
  configurationKey: text("configuration_key").notNull(),
  userId: uuid("user_id").notNull().references(() => userAccounts.id, { onDelete: "cascade" }),
  value: smallint("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.configurationKey, table.userId] }), index("configuration_votes_user_idx").on(table.userId)]);
export const configurationComments = pgTable("configuration_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  configurationKey: text("configuration_key").notNull(),
  userId: uuid("user_id").notNull().references(() => userAccounts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("configuration_comments_key_created_idx").on(table.configurationKey, table.createdAt), index("configuration_comments_user_idx").on(table.userId)]);

export const catalogSources = pgTable("catalog_sources", {
  code: varchar("code", { length: 40 }).primaryKey(), displayName: varchar("display_name", { length: 80 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("idle"), lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }), nextSyncAt: timestamp("next_sync_at", { withTimezone: true }),
  lastError: text("last_error"), updatedParts: integer("updated_parts").notNull().default(0), candidateCount: integer("candidate_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
export const catalogSyncRuns = pgTable("catalog_sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(), sourceCode: varchar("source_code", { length: 40 }).notNull().references(() => catalogSources.code),
  status: varchar("status", { length: 20 }).notNull(), startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }), fetchedCount: integer("fetched_count").notNull().default(0),
  updatedParts: integer("updated_parts").notNull().default(0), candidateCount: integer("candidate_count").notNull().default(0), errorMessage: text("error_message")
}, (table) => [index("catalog_sync_runs_source_started_idx").on(table.sourceCode, table.startedAt)]);
export const partMarketOffers = pgTable("part_market_offers", {
  id: uuid("id").primaryKey().defaultRandom(), sourceCode: varchar("source_code", { length: 40 }).notNull().references(() => catalogSources.code),
  externalId: varchar("external_id", { length: 160 }).notNull(), partId: varchar("part_id", { length: 100 }).notNull().references(() => parts.id, { onDelete: "cascade" }),
  title: text("title").notNull(), sellerName: varchar("seller_name", { length: 160 }).notNull().default(""), priceFen: integer("price_fen").notNull(),
  productUrl: text("product_url").notNull(), imageUrl: text("image_url").notNull().default(""), fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [uniqueIndex("part_market_offers_source_external_idx").on(table.sourceCode, table.externalId), index("part_market_offers_part_fetched_idx").on(table.partId, table.fetchedAt)]);
export const catalogSyncCandidates = pgTable("catalog_sync_candidates", {
  id: uuid("id").primaryKey().defaultRandom(), sourceCode: varchar("source_code", { length: 40 }).notNull().references(() => catalogSources.code),
  externalId: varchar("external_id", { length: 160 }).notNull(), categoryCode: varchar("category_code", { length: 32 }).notNull(), title: text("title").notNull(),
  brand: varchar("brand", { length: 100 }).notNull().default(""), model: varchar("model", { length: 160 }).notNull().default(""), priceFen: integer("price_fen").notNull(),
  productUrl: text("product_url").notNull(), imageUrl: text("image_url").notNull().default(""), status: varchar("status", { length: 20 }).notNull().default("pending"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(), lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [uniqueIndex("catalog_sync_candidates_source_external_idx").on(table.sourceCode, table.externalId), index("catalog_sync_candidates_status_category_idx").on(table.status, table.categoryCode, table.lastSeenAt)]);

export const schema = {
  partCategories, parts, cpuSpecs, motherboardSpecs, memorySpecs, gpuSpecs, caseSpecs,
  coolerSpecs, psuSpecs, storageSpecs, builds, buildItems, buildCheckResults,
  adminUsers, adminSessions, auditLogs, analyticsEvents, userAccounts, userSessions,
  publishedConfigurations, configurationEngagement, configurationVotes, configurationComments,
  catalogSources, catalogSyncRuns, partMarketOffers, catalogSyncCandidates
};
