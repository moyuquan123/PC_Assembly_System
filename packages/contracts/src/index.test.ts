import { describe, expect, it } from "vitest";
import { adminLoginSchema, buildInputSchema, partSchema, publishedConfigurationInputSchema, recommendationInputSchema } from "./index.js";

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

  it("validates bounded smart recommendation inputs", () => {
    expect(recommendationInputSchema.safeParse({
      budgetFen: 900_000,
      usage: "内容创作",
      preferences: { quiet: true, upgradeFriendly: true }
    }).success).toBe(true);
    expect(recommendationInputSchema.safeParse({ budgetFen: 100_000, usage: "游戏" }).success).toBe(false);
    expect(recommendationInputSchema.safeParse({ budgetFen: 900_000, usage: "未知" }).success).toBe(false);
  });

  it("validates a bounded anonymous configuration submission", () => {
    const valid = publishedConfigurationInputSchema.safeParse({
      anonymousId: "27a25667-b7a0-4fc1-8c29-b0be0e7a250d",
      authorName: "小明",
      name: "我的 2K 游戏主机",
      configurationClass: "主流游戏",
      description: "兼顾 2K 游戏帧率与后续升级。",
      selectedPartIds: { cpu: "cpu-7600x" }
    });
    expect(valid.success).toBe(true);
    expect(publishedConfigurationInputSchema.safeParse({ ...valid.data, authorName: "" }).success).toBe(false);
    expect(publishedConfigurationInputSchema.safeParse({ ...valid.data, configurationClass: "未知分类" }).success).toBe(false);
  });
});
