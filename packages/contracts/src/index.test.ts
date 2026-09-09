import { describe, expect, it } from "vitest";
import { adminLoginSchema, buildInputSchema, configurationCommentSchema, configurationKeySchema, configurationVoteSchema, partSchema, publishedConfigurationInputSchema, recommendationInputSchema, userRegistrationSchema } from "./index.js";

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

  it("validates a bounded account-owned configuration submission", () => {
    const valid = publishedConfigurationInputSchema.safeParse({
      name: "我的 2K 游戏主机",
      configurationClass: "主流游戏",
      description: "兼顾 2K 游戏帧率与后续升级。",
      selectedPartIds: { cpu: "cpu-7600x" }
    });
    expect(valid.success).toBe(true);
    expect(publishedConfigurationInputSchema.safeParse({ ...valid.data, configurationClass: "未知分类" }).success).toBe(false);
  });

  it("validates community account and engagement inputs", () => {
    expect(userRegistrationSchema.safeParse({ username: "pc_fan", displayName: "装机玩家", password: "Password123!" }).success).toBe(true);
    expect(userRegistrationSchema.safeParse({ username: "中文名", displayName: "装机玩家", password: "Password123!" }).success).toBe(false);
    expect(configurationKeySchema.safeParse("official:amd-mainstream-gaming").success).toBe(true);
    expect(configurationKeySchema.safeParse("community:27a25667-b7a0-4fc1-8c29-b0be0e7a250d").success).toBe(true);
    expect(configurationVoteSchema.safeParse({ value: -1 }).success).toBe(true);
    expect(configurationVoteSchema.safeParse({ value: 2 }).success).toBe(false);
    expect(configurationCommentSchema.safeParse({ content: "这套配置很均衡。" }).success).toBe(true);
    expect(configurationCommentSchema.safeParse({ content: " ".repeat(10) }).success).toBe(false);
  });
});
