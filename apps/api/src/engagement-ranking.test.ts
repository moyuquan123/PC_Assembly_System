import { describe, expect, it } from "vitest";
import { calculateEngagementMetrics } from "./engagement-ranking.js";

describe("hybrid configuration ranking", () => {
  it("rewards recommendations, comments and click-through rate", () => {
    const quiet = calculateEngagementMetrics({ recommendCount: 2, notRecommendCount: 0, commentCount: 1, impressionCount: 100, clickCount: 5 });
    const popular = calculateEngagementMetrics({ recommendCount: 20, notRecommendCount: 1, commentCount: 8, impressionCount: 100, clickCount: 20 });
    expect(popular.hybridScore).toBeGreaterThan(quiet.hybridScore);
    expect(popular.clickRate).toBe(0.2);
  });

  it("penalizes negative votes and caps click-rate influence", () => {
    const negative = calculateEngagementMetrics({ recommendCount: 5, notRecommendCount: 20, commentCount: 2, impressionCount: 10, clickCount: 10 });
    const balanced = calculateEngagementMetrics({ recommendCount: 5, notRecommendCount: 0, commentCount: 2, impressionCount: 10, clickCount: 4 });
    expect(balanced.hybridScore).toBeGreaterThan(negative.hybridScore);
  });
});
