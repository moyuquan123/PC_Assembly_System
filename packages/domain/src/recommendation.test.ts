import { describe, expect, it } from "vitest";
import { seedParts } from "./catalog.js";
import { recommendBuilds, RECOMMENDATION_VERSION } from "./recommendation.js";
import { categoryCodes } from "./types.js";

describe("smart build recommendation", () => {
  it("returns three distinct, complete and compatible strategies", () => {
    const recommendations = recommendBuilds(seedParts, { budgetFen: 900_000, usage: "游戏" });

    expect(RECOMMENDATION_VERSION).toMatch(/^\d{4}\.\d{2}\.\d+$/);
    expect(recommendations.map((item) => item.strategy)).toEqual(["balanced", "performance", "value"]);
    expect(new Set(recommendations.map((item) => Object.values(item.selectedPartIds).join("|"))).size).toBe(3);
    for (const recommendation of recommendations) {
      expect(Object.keys(recommendation.selectedPartIds).toSorted()).toEqual([...categoryCodes].toSorted());
      expect(recommendation.parts).toHaveLength(8);
      expect(recommendation.checks.some((check) => check.level === "incompatible")).toBe(false);
      expect(recommendation.reasons.length).toBeGreaterThan(0);
      expect(recommendation.tradeoffs.length).toBeGreaterThan(0);
    }
    const balanced = recommendations.find((item) => item.strategy === "balanced")!;
    const performance = recommendations.find((item) => item.strategy === "performance")!;
    expect(performance.score).toBeGreaterThan(balanced.score - 30);
    expect(performance.parts.find((part) => part.category === "psu")!.priceFen).toBeLessThan(100_000);
  });

  it("is deterministic and never recommends inactive parts", () => {
    const input = { budgetFen: 1_100_000, usage: "内容创作" as const, preferences: { upgradeFriendly: true } };
    const inactiveId = seedParts[0]!.id;
    const catalog = seedParts.map((part) => part.id === inactiveId ? { ...part, status: "inactive" as const } : part);
    const first = recommendBuilds(catalog, input);
    const second = recommendBuilds(catalog, input);

    expect(first.map((item) => item.selectedPartIds)).toEqual(second.map((item) => item.selectedPartIds));
    expect(first.every((item) => !item.parts.some((part) => part.id === inactiveId))).toBe(true);
  });

  it("returns no recommendation when a required category has no active inventory", () => {
    const withoutPowerSupplies = seedParts.filter((part) => part.category !== "psu");
    expect(recommendBuilds(withoutPowerSupplies, { budgetFen: 900_000, usage: "办公" })).toEqual([]);
  });
});
