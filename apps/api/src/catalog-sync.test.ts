import { describe, expect, it } from "vitest";
import { CatalogSyncService, signTaobao } from "./catalog-sync.js";
import { MemoryStore } from "./store.js";

describe("catalog sync", () => {
  it("updates matched prices and reports candidate freshness", async () => {
    const store = new MemoryStore();
    const service = new CatalogSyncService(store, {
      code: "test-market",
      name: "测试市场",
      async fetch() {
        return {
          offers: [{ externalId: "sku-1", partId: "cpu-7600x", title: "AMD Ryzen 5 7600X", sellerName: "测试店铺", priceFen: 149_900, productUrl: "https://example.test/sku-1", imageUrl: "" }],
          candidates: [{ externalId: "sku-2", categoryCode: "gpu", title: "新显卡", brand: "", model: "新显卡", priceFen: 399_900, productUrl: "https://example.test/sku-2", imageUrl: "" }]
        };
      }
    }, 60);

    const freshness = await service.runOnce();
    expect(freshness).toEqual(expect.objectContaining({ status: "healthy", updatedParts: 1, candidateCount: 1 }));
    expect((await store.getPart("cpu-7600x"))?.priceFen).toBe(149_900);
  });

  it("creates a stable uppercase HMAC signature", () => {
    expect(signTaobao({ method: "demo", app_key: "key", sign_method: "hmac" }, "secret")).toMatch(/^[0-9A-F]{32}$/);
  });
});
