import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { MemoryStore } from "./store.js";
import type { FastifyInstance } from "fastify";
import type { ImageStorage, UploadRequest } from "./image-storage.js";

const completeBuild = {
  name: "兼容游戏主机",
  budgetFen: 900_000,
  usage: "游戏",
  selectedPartIds: {
    cpu: "cpu-7600x",
    motherboard: "mb-b650",
    gpu: "gpu-4060ti",
    memory: "ram-fury",
    storage: "ssd-tiplus",
    psu: "psu-g7",
    case: "case-air100",
    cooler: "cooler-pa120"
  }
};

const apps: FastifyInstance[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

async function testApp(imageStorage?: ImageStorage) {
  const store = new MemoryStore();
  const app = await createApp({
    store,
    bootstrapAdmin: { username: "admin", password: "Admin123!" },
    ...(imageStorage ? { imageStorage } : {})
  });
  apps.push(app);
  return { app, store };
}

async function registerUser(app: FastifyInstance, username = "pc_fan", displayName = "小明") {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/users",
    headers: { origin: "http://127.0.0.1:4173" },
    payload: { username, displayName, password: "Password123!" }
  });
  const setCookie = response.headers["set-cookie"];
  return { response, cookie: (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0] };
}

describe("public API", () => {
  it("serves categories and filters active catalog parts", async () => {
    const { app } = await testApp();
    const categories = await app.inject({ method: "GET", url: "/api/v1/categories" });
    expect(categories.statusCode).toBe(200);
    expect(categories.json().data).toHaveLength(8);

    const parts = await app.inject({ method: "GET", url: "/api/v1/parts?category=cpu&keyword=7600" });
    expect(parts.statusCode).toBe(200);
    expect(parts.json().data).toEqual([expect.objectContaining({ id: "cpu-7600x" })]);
    expect(parts.json().requestId).toBeTruthy();
  });

  it("rejects an incompatible build with a stable error code", async () => {
    const { app } = await testApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/builds",
      payload: { ...completeBuild, selectedPartIds: { ...completeBuild.selectedPartIds, motherboard: "mb-b760" } }
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("BUILD_INCOMPATIBLE");
  });

  it("saves a compatible snapshot and restores it without local state", async () => {
    const { app } = await testApp();
    const saved = await app.inject({ method: "POST", url: "/api/v1/builds", payload: completeBuild });
    expect(saved.statusCode).toBe(201);
    const { shareCode, sharePath } = saved.json().data;
    expect(sharePath).toBe(`/builds/${shareCode}`);

    const shared = await app.inject({ method: "GET", url: `/api/v1/builds/${shareCode}` });
    expect(shared.statusCode).toBe(200);
    expect(shared.json().data.name).toBe("兼容游戏主机");
    expect(shared.json().data.parts).toHaveLength(8);
    expect(JSON.stringify(shared.json())).not.toContain(shareCode);
  });

  it("returns three server-validated smart recommendations", async () => {
    const { app } = await testApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/recommendations",
      payload: { budgetFen: 900_000, usage: "游戏", preferences: { upgradeFriendly: true } }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.recommendationVersion).toBeTruthy();
    expect(response.json().data.recommendations).toHaveLength(3);
    expect(response.json().data.recommendations.every((item: any) => item.parts.length === 8)).toBe(true);
    expect(response.json().data.recommendations.flatMap((item: any) => item.checks).some((check: any) => check.level === "incompatible")).toBe(false);
  });

  it("publishes and lists a complete compatible user configuration", async () => {
    const { app } = await testApp();
    const { cookie } = await registerUser(app);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/configurations",
      headers: { origin: "http://127.0.0.1:4173", cookie: cookie! },
      payload: {
        name: "我的 2K 游戏主机",
        configurationClass: "主流游戏",
        description: "兼顾游戏性能与升级空间。",
        selectedPartIds: completeBuild.selectedPartIds
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data).toEqual(expect.objectContaining({ authorName: "小明", name: "我的 2K 游戏主机" }));
    expect(response.json().data.parts).toHaveLength(8);
    expect(response.json().data.anonymousId).toBeUndefined();

    const listed = await app.inject({ method: "GET", url: "/api/v1/configurations" });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data).toHaveLength(1);
    expect(listed.json().data[0].summary.progress).toBe(8);
  });

  it("blocks incomplete or incompatible user configurations", async () => {
    const { app } = await testApp();
    const { cookie } = await registerUser(app, "builder_user", "测试用户");
    const base = {
      name: "待检查配置",
      configurationClass: "主流游戏",
      description: ""
    };
    const incomplete = await app.inject({ method: "POST", url: "/api/v1/configurations", headers: { origin: "http://127.0.0.1:4173", cookie: cookie! }, payload: { ...base, selectedPartIds: { cpu: "cpu-7600x" } } });
    expect(incomplete.statusCode).toBe(400);
    expect(incomplete.json().error.code).toBe("CONFIGURATION_INCOMPLETE");

    const incompatible = await app.inject({
      method: "POST",
      url: "/api/v1/configurations",
      headers: { origin: "http://127.0.0.1:4173", cookie: cookie! },
      payload: { ...base, selectedPartIds: { ...completeBuild.selectedPartIds, motherboard: "mb-b760" } }
    });
    expect(incompatible.statusCode).toBe(409);
    expect(incompatible.json().error.code).toBe("CONFIGURATION_INCOMPATIBLE");
  });

  it("registers, restores, logs in and rejects a duplicate user account", async () => {
    const { app } = await testApp();
    const { response, cookie } = await registerUser(app);
    expect(response.statusCode).toBe(201);
    expect(response.json().data).toEqual(expect.objectContaining({ username: "pc_fan", displayName: "小明" }));
    expect(response.json().data.passwordHash).toBeUndefined();

    const current = await app.inject({ method: "GET", url: "/api/v1/users/me", headers: { cookie: cookie! } });
    expect(current.statusCode).toBe(200);
    const duplicate = await registerUser(app);
    expect(duplicate.response.statusCode).toBe(409);

    const login = await app.inject({ method: "POST", url: "/api/v1/user-sessions", headers: { origin: "http://127.0.0.1:4173" }, payload: { username: "pc_fan", password: "Password123!" } });
    expect(login.statusCode).toBe(200);
    const loginCookieHeader = login.headers["set-cookie"];
    const loginCookie = (Array.isArray(loginCookieHeader) ? loginCookieHeader[0] : loginCookieHeader)?.split(";")[0];
    const logout = await app.inject({ method: "DELETE", url: "/api/v1/user-sessions/current", headers: { origin: "http://127.0.0.1:4173", cookie: loginCookie! } });
    expect(logout.statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/v1/users/me", headers: { cookie: loginCookie! } })).statusCode).toBe(401);
  });

  it("updates a user profile and returns the personal dashboard", async () => {
    const { app } = await testApp();
    const { cookie } = await registerUser(app, "profile_user", "资料用户");
    const headers = { origin: "http://127.0.0.1:4173", cookie: cookie! };
    const updated = await app.inject({ method: "PATCH", url: "/api/v1/users/me", headers, payload: { displayName: "装机小明", bio: "喜欢研究高性价比电脑", location: "上海" } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data).toEqual(expect.objectContaining({ displayName: "装机小明", bio: "喜欢研究高性价比电脑", location: "上海" }));

    const published = await app.inject({ method: "POST", url: "/api/v1/configurations", headers, payload: { name: "个人主页配置", configurationClass: "主流游戏", description: "", selectedPartIds: completeBuild.selectedPartIds } });
    const key = `community:${published.json().data.id}`;
    await app.inject({ method: "POST", url: `/api/v1/configurations/${key}/vote`, headers, payload: { value: 1 } });
    await app.inject({ method: "POST", url: "/api/v1/configurations/official:amd-office-entry/comments", headers, payload: { content: "适合办公" } });

    const dashboard = await app.inject({ method: "GET", url: "/api/v1/users/me/dashboard", headers: { cookie: cookie! } });
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.json().data.stats).toEqual({ publishedCount: 1, recommendationsReceived: 1, commentsWritten: 1 });
    expect(dashboard.json().data.configurations[0].authorName).toBe("装机小明");
    expect(dashboard.json().data.activities).toHaveLength(2);
  });

  it("reports when the live catalog source is not configured", async () => {
    const { app } = await testApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/catalog/freshness" });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual(expect.objectContaining({ mode: "local", status: "disabled" }));
  });

  it("tracks impressions and clicks, then enforces one mutable vote and authenticated comments", async () => {
    const { app } = await testApp();
    const key = "official:amd-mainstream-gaming";
    const { cookie } = await registerUser(app, "reviewer", "装机评测员");
    const headers = { origin: "http://127.0.0.1:4173", cookie: cookie! };

    expect((await app.inject({ method: "POST", url: "/api/v1/configuration-impressions", headers, payload: { keys: [key] } })).statusCode).toBe(201);
    expect((await app.inject({ method: "POST", url: `/api/v1/configurations/${key}/click`, headers })).statusCode).toBe(201);
    await app.inject({ method: "POST", url: `/api/v1/configurations/${key}/vote`, headers, payload: { value: 1 } });
    await app.inject({ method: "POST", url: `/api/v1/configurations/${key}/vote`, headers, payload: { value: -1 } });

    const comment = await app.inject({ method: "POST", url: `/api/v1/configurations/${key}/comments`, headers, payload: { content: "散热和电源余量都很合理。" } });
    expect(comment.statusCode).toBe(201);
    const comments = await app.inject({ method: "GET", url: `/api/v1/configurations/${key}/comments` });
    expect(comments.json().data).toEqual([expect.objectContaining({ content: "散热和电源余量都很合理。" })]);

    const metrics = await app.inject({ method: "GET", url: `/api/v1/configuration-engagement?keys=${encodeURIComponent(key)}`, headers: { cookie: cookie! } });
    expect(metrics.json().data[0]).toEqual(expect.objectContaining({ recommendCount: 0, notRecommendCount: 1, commentCount: 1, impressionCount: 1, clickCount: 1, clickRate: 1, myVote: -1 }));
  });

  it("requires login for publishing, voting and commenting", async () => {
    const { app } = await testApp();
    const key = "official:amd-office-entry";
    const headers = { origin: "http://127.0.0.1:4173" };
    expect((await app.inject({ method: "POST", url: `/api/v1/configurations/${key}/vote`, headers, payload: { value: 1 } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: `/api/v1/configurations/${key}/comments`, headers, payload: { content: "测试" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/api/v1/configurations", headers, payload: { name: "测试配置", configurationClass: "主流游戏", description: "", selectedPartIds: completeBuild.selectedPartIds } })).statusCode).toBe(401);
  });
});

describe("admin API", () => {
  it("requires a valid session and same-origin write, then audits an update", async () => {
    const { app, store } = await testApp();
    const unauthorized = await app.inject({ method: "GET", url: "/api/v1/admin/parts" });
    expect(unauthorized.statusCode).toBe(401);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/admin/sessions",
      payload: { username: "admin", password: "Admin123!" }
    });
    expect(login.statusCode).toBe(200);
    const setCookie = login.headers["set-cookie"];
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0];
    expect(cookie).toBeTruthy();

    const blocked = await app.inject({ method: "PATCH", url: "/api/v1/admin/parts/cpu-7600x", headers: { cookie: cookie! }, payload: { priceFen: 150_000 } });
    expect(blocked.statusCode).toBe(403);

    const updated = await app.inject({
      method: "PATCH",
      url: "/api/v1/admin/parts/cpu-7600x",
      headers: { cookie: cookie!, origin: "http://127.0.0.1:4173" },
      payload: { priceFen: 150_000 }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data.priceFen).toBe(150_000);
    expect(store.audits).toHaveLength(1);
  });

  it("does not reset an existing bootstrap administrator password", async () => {
    const store = new MemoryStore();
    const first = await createApp({ store, bootstrapAdmin: { username: "admin", password: "FirstPassword123!" } });
    apps.push(first);
    const second = await createApp({ store, bootstrapAdmin: { username: "admin", password: "SecondPassword123!" } });
    apps.push(second);

    const originalPassword = await second.inject({
      method: "POST",
      url: "/api/v1/admin/sessions",
      payload: { username: "admin", password: "FirstPassword123!" }
    });
    const replacementPassword = await second.inject({
      method: "POST",
      url: "/api/v1/admin/sessions",
      payload: { username: "admin", password: "SecondPassword123!" }
    });

    expect(originalPassword.statusCode).toBe(200);
    expect(replacementPassword.statusCode).toBe(401);
  });

  it("rejects a patch that makes the part category disagree with its specs", async () => {
    const { app } = await testApp();
    const login = await app.inject({ method: "POST", url: "/api/v1/admin/sessions", payload: { username: "admin", password: "Admin123!" } });
    const setCookie = login.headers["set-cookie"];
    const sessionCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0];
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/admin/parts/cpu-7600x",
      headers: { cookie: sessionCookie!, origin: "http://127.0.0.1:4173" },
      payload: { category: "gpu" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects event properties outside the first-party allowlist", async () => {
    const { app } = await testApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { eventName: "build_started", anonymousId: "27a25667-b7a0-4fc1-8c29-b0be0e7a250d", properties: { email: "no@example.com" } }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_FAILED");
  });

  it("issues a short-lived image upload target only to an authenticated same-origin admin", async () => {
    let received: UploadRequest | undefined;
    const imageStorage: ImageStorage = {
      async createUpload(request) {
        received = request;
        return {
          key: "parts/2026-09-08/test.webp",
          uploadUrl: "https://storage.example.test/upload",
          publicUrl: "https://cdn.example.test/parts/2026-09-08/test.webp",
          expiresInSeconds: 300
        };
      }
    };
    const { app } = await testApp(imageStorage);
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/admin/sessions",
      payload: { username: "admin", password: "Admin123!" }
    });
    const setCookie = login.headers["set-cookie"];
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0];

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/uploads",
      headers: { cookie: cookie!, origin: "http://127.0.0.1:4173" },
      payload: { contentType: "image/webp", sizeBytes: 42_000, extension: "webp" }
    });

    expect(response.statusCode).toBe(201);
    expect(received).toEqual({ contentType: "image/webp", sizeBytes: 42_000, extension: "webp" });
    expect(response.json().data).toEqual(expect.objectContaining({ expiresInSeconds: 300 }));
  });
});
