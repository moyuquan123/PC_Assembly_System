import { describe, expect, it } from "vitest";
import { adminLoginSchema, buildInputSchema, partSchema } from "./index.js";

describe("API contracts", () => {
  it("rejects floating-point budgets and incomplete credentials", () => {
    expect(buildInputSchema.safeParse({ name: "A", budgetFen: 800000.5, usage: "游戏", selectedPartIds: {} }).success).toBe(false);
    expect(adminLoginSchema.safeParse({ username: "ad", password: "short" }).success).toBe(false);
  });

  it("rejects a part whose category does not match its structured specs", () => {
    const parsed = partSchema.safeParse({
      id: "bad-part", category: "cpu", brand: "品牌", model: "型号", name: "品牌 型号",
      priceFen: 10000, imageUrl: "", status: "active", updatedAt: new Date().toISOString(),
      displaySpecs: [], specs: { kind: "gpu", lengthMm: 200, powerW: 100 }
    });
    expect(parsed.success).toBe(false);
  });
});
