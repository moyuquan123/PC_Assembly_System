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
