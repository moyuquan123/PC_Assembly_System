import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { hash, verify } from "@node-rs/argon2";
import {
  adminLoginSchema,
  adminPartCreateSchema,
  adminPartPatchSchema,
  analyticsEventSchema,
  buildInputSchema,
  compatibilityCheckSchema,
  imageUploadRequestSchema,
  partIdParamsSchema,
  partsQuerySchema,
  shareCodeParamsSchema
} from "@pc-assembly/contracts";
import type { AnalyticsEventInput } from "@pc-assembly/contracts";
import { categories, categoryCodes, checkCompatibility, RULE_VERSION, summarizeBuild } from "@pc-assembly/domain";
import type { CategoryCode, Part } from "@pc-assembly/domain";
import Fastify from "fastify";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodType } from "zod";
import { ApiError } from "./errors.js";
import { createOpaqueToken, hashToken, SESSION_COOKIE, SESSION_TTL_MS } from "./security.js";
import { MemoryStore } from "./store.js";
import type { AdminUser, Store } from "./store.js";
import type { ImageStorage } from "./image-storage.js";

declare module "fastify" {
  interface FastifyRequest { admin?: AdminUser; }
}

export interface AppOptions {
  store?: Store;
  logger?: boolean;
  production?: boolean;
  allowedOrigins?: string[];
  bootstrapAdmin?: { username: string; password: string };
  imageStorage?: ImageStorage;
}

const responseSchema = {
  200: {
    type: "object",
    required: ["requestId", "data"],
    properties: { requestId: { type: "string" }, data: {} }
  },
  201: {
    type: "object",
    required: ["requestId", "data"],
    properties: { requestId: { type: "string" }, data: {} }
  },
  204: { type: "null" },
  "4xx": {
    type: "object",
    required: ["requestId", "error"],
    properties: {
      requestId: { type: "string" },
      error: {
        type: "object",
        required: ["code", "message"],
        properties: { code: { type: "string" }, message: { type: "string" }, details: {} }
      }
    }
  },
  "5xx": {
    type: "object",
    required: ["requestId", "error"],
    properties: {
      requestId: { type: "string" },
      error: {
        type: "object",
        required: ["code", "message"],
        properties: { code: { type: "string" }, message: { type: "string" } }
      }
    }
  }
} as const;

function parse<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, "VALIDATION_FAILED", "请求参数不正确。", parsed.error.flatten());
  return parsed.data;
}

function data(request: FastifyRequest, value: unknown) {
  return { requestId: request.id, data: value };
}

const eventProperties: Record<AnalyticsEventInput["eventName"], Set<string>> = {
  build_started: new Set(["usage", "budgetRange"]),
  part_selected: new Set(["category", "step"]),
  compatibility_triggered: new Set(["ruleId", "level", "categories"]),
  part_changed_after_warning: new Set(["ruleId", "category"]),
  build_completed: new Set(["durationSeconds", "budgetRange", "totalRange"]),
  build_saved_local: new Set(["progress"]),
  build_shared: new Set(["progress", "hasWarning"])
};

export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const store = options.store ?? new MemoryStore();
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 256 * 1024, requestIdHeader: "x-request-id" });
  const allowedOrigins = new Set(options.allowedOrigins ?? ["http://127.0.0.1:4173", "http://localhost:4173"]);

  await app.register(cookie);
  await app.register(rateLimit, { global: false, max: 120, timeWindow: "1 minute" });

  if (options.bootstrapAdmin) {
    const passwordHash = await hash(options.bootstrapAdmin.password, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });
    await store.upsertAdmin(options.bootstrapAdmin.username, passwordHash);
  }

  app.decorate("store", store);
  app.addHook("onClose", async () => store.close());

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        requestId: request.id,
        error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) }
      });
    }
    if (error instanceof Error && error.message === "PART_ID_EXISTS") {
      return reply.status(409).send({ requestId: request.id, error: { code: "PART_ID_EXISTS", message: "配件 ID 已存在。" } });
    }
    request.log.error(error);
    return reply.status(500).send({ requestId: request.id, error: { code: "INTERNAL_ERROR", message: "服务暂时不可用。" } });
  });

  async function requireAdmin(request: FastifyRequest): Promise<void> {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) throw new ApiError(401, "ADMIN_AUTH_REQUIRED", "请先登录管理员账号。");
    const session = await store.getSession(hashToken(token));
    const admin = session ? await store.getAdminById(session.adminUserId) : undefined;
    if (!admin || admin.status !== "active") throw new ApiError(401, "ADMIN_SESSION_INVALID", "管理员会话已失效。");
    request.admin = admin;
  }

  async function requireSameOrigin(request: FastifyRequest): Promise<void> {
    const origin = request.headers.origin;
    if (!origin || !allowedOrigins.has(origin)) throw new ApiError(403, "ORIGIN_NOT_ALLOWED", "请求来源未通过安全检查。");
  }

  app.get("/health/live", { schema: { response: responseSchema } }, async (request) => data(request, { status: "ok" }));
  app.get("/health/ready", { schema: { response: responseSchema } }, async (request) => {
    if (!(await store.ready())) throw new ApiError(503, "NOT_READY", "数据库尚未就绪。");
    return data(request, { status: "ready" });
  });

  app.get("/api/v1/categories", { schema: { response: responseSchema } }, async (request) => data(request, categories));
  app.get("/api/v1/parts", { schema: { response: responseSchema } }, async (request) => {
    const query = parse(partsQuerySchema, request.query);
    return data(request, await store.listParts(query));
  });
  app.get("/api/v1/parts/:id", { schema: { response: responseSchema } }, async (request) => {
    const { id } = parse(partIdParamsSchema, request.params);
    const part = await store.getPart(id);
    if (!part) throw new ApiError(404, "PART_NOT_FOUND", "没有找到该配件。");
    return data(request, part);
  });
  app.post("/api/v1/compatibility/check", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } }, schema: { response: responseSchema } }, async (request) => {
    const input = parse(compatibilityCheckSchema, request.body);
    const parts = await resolveParts(input.selectedPartIds, store);
    const snapshot = { name: "兼容性检查", budgetFen: 200_000, usage: "游戏" as const, parts };
    return data(request, { ruleVersion: RULE_VERSION, results: checkCompatibility(snapshot), summary: summarizeBuild(snapshot) });
  });
  app.post("/api/v1/builds", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } }, schema: { response: responseSchema } }, async (request, reply) => {
    const input = parse(buildInputSchema, request.body);
    const missing = categoryCodes.filter((category) => !input.selectedPartIds[category]);
    if (missing.length > 0) throw new ApiError(400, "BUILD_INCOMPLETE", "请选择完整的八类配件后再生成分享链接。", { missing });
    const parts = await resolveParts(input.selectedPartIds, store);
    const snapshot = { name: input.name, budgetFen: input.budgetFen, usage: input.usage, parts };
    const checks = checkCompatibility(snapshot);
    if (checks.some((check) => check.level === "incompatible")) {
      throw new ApiError(409, "BUILD_INCOMPATIBLE", "当前配置存在明确冲突，无法生成分享链接。", { checks });
    }
    const shareCode = createOpaqueToken(18);
    const stored = await store.saveBuild(hashToken(shareCode), input, parts, checks, RULE_VERSION);
    reply.status(201);
    return data(request, { ...stored, shareCode, sharePath: `/builds/${shareCode}`, summary: summarizeBuild(snapshot) });
  });
  app.get("/api/v1/builds/:shareCode", { schema: { response: responseSchema } }, async (request) => {
    const { shareCode } = parse(shareCodeParamsSchema, request.params);
    const stored = await store.getBuildByShareHash(hashToken(shareCode));
    if (!stored) throw new ApiError(404, "BUILD_NOT_FOUND", "该分享配置不存在或已失效。");
    return data(request, { ...stored, summary: summarizeBuild({ name: stored.name, budgetFen: stored.budgetFen, usage: stored.usage, parts: stored.parts }) });
  });

  app.post("/api/v1/admin/sessions", { config: { rateLimit: { max: 8, timeWindow: "5 minutes" } }, schema: { response: responseSchema } }, async (request, reply) => {
    const credentials = parse(adminLoginSchema, request.body);
    const admin = await store.getAdminByUsername(credentials.username);
    const valid = admin?.status === "active" && await verify(admin.passwordHash, credentials.password);
    if (!valid || !admin) throw new ApiError(401, "ADMIN_CREDENTIALS_INVALID", "用户名或密码不正确。");
    const token = createOpaqueToken();
    await store.createSession({ idHash: hashToken(token), adminUserId: admin.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
    reply.setCookie(SESSION_COOKIE, token, { path: "/api/v1/admin", httpOnly: true, secure: options.production ?? false, sameSite: "strict", maxAge: SESSION_TTL_MS / 1000 });
    return data(request, { username: admin.username });
  });
  app.delete("/api/v1/admin/sessions/current", { preHandler: [requireAdmin, requireSameOrigin], schema: { response: responseSchema } }, async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await store.deleteSession(hashToken(token));
    reply.clearCookie(SESSION_COOKIE, { path: "/api/v1/admin" });
    return data(request, { loggedOut: true });
  });
  app.get("/api/v1/admin/parts", { preHandler: requireAdmin, schema: { response: responseSchema } }, async (request) => data(request, await store.listParts({}, true)));
  app.post("/api/v1/admin/parts", { preHandler: [requireAdmin, requireSameOrigin], schema: { response: responseSchema } }, async (request, reply) => {
    const input = parse(adminPartCreateSchema, request.body);
    const part = await store.createPart(input);
    await store.addAudit(request.admin!.id, "part.created", part.id, { after: part });
    reply.status(201);
    return data(request, part);
  });
  app.patch("/api/v1/admin/parts/:id", { preHandler: [requireAdmin, requireSameOrigin], schema: { response: responseSchema } }, async (request) => {
    const { id } = parse(partIdParamsSchema, request.params);
    const patch = parse(adminPartPatchSchema, request.body);
    const before = await store.getPart(id, true);
    if (!before) throw new ApiError(404, "PART_NOT_FOUND", "没有找到该配件。");
    const part = await store.updatePart(id, patch);
    await store.addAudit(request.admin!.id, "part.updated", id, { before, after: part });
    return data(request, part);
  });
  app.post("/api/v1/admin/uploads", { preHandler: [requireAdmin, requireSameOrigin], schema: { response: responseSchema } }, async (request, reply) => {
    if (!options.imageStorage) throw new ApiError(503, "STORAGE_NOT_CONFIGURED", "对象存储尚未配置。");
    const input = parse(imageUploadRequestSchema, request.body);
    const target = await options.imageStorage.createUpload(input);
    reply.status(201);
    return data(request, target);
  });
  app.post("/api/v1/events", { config: { rateLimit: { max: 90, timeWindow: "1 minute" } }, schema: { response: responseSchema } }, async (request, reply) => {
    const event = parse(analyticsEventSchema, request.body);
    const allowed = eventProperties[event.eventName];
    const unknownKeys = Object.keys(event.properties).filter((key) => !allowed.has(key));
    if (unknownKeys.length > 0) throw new ApiError(400, "VALIDATION_FAILED", "分析事件包含未允许的属性。", { unknownKeys });
    await store.addEvent(event);
    reply.status(201);
    return data(request, { accepted: true });
  });

  return app;
}

type SelectedPartIdsInput = { [Key in CategoryCode]?: string | undefined };

async function resolveParts(selectedPartIds: SelectedPartIdsInput, store: Store): Promise<Part[]> {
  const ids = categoryCodes.flatMap((category) => {
    const id = selectedPartIds[category];
    return id ? [id] : [];
  });
  const parts = (await Promise.all(ids.map((id) => store.getPart(id)))).filter((part): part is Part => Boolean(part));
  if (parts.length !== ids.length) throw new ApiError(404, "PART_NOT_FOUND", "配置包含不存在或已下架的配件。");
  const mismatched = parts.find((part) => selectedPartIds[part.category] !== part.id);
  if (mismatched) throw new ApiError(400, "VALIDATION_FAILED", "配件分类与选择项不一致。");
  return parts;
}
