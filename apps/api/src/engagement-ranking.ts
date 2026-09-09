export interface EngagementCounts {
  recommendCount: number;
  notRecommendCount: number;
  commentCount: number;
  impressionCount: number;
  clickCount: number;
}

export function calculateEngagementMetrics(counts: EngagementCounts) {
  const votes = counts.recommendCount + counts.notRecommendCount;
  const approval = (counts.recommendCount + 2) / (votes + 4);
  const clickRate = counts.impressionCount > 0 ? Math.min(counts.clickCount / counts.impressionCount, 1) : 0;
  const hybridScore = approval * 40
    + Math.log1p(counts.recommendCount) * 12
    + Math.log1p(counts.commentCount) * 8
    + Math.min(clickRate, 0.4) * 25
    - Math.log1p(counts.notRecommendCount) * 10;
  return { ...counts, clickRate, hybridScore: Math.max(0, Number(hybridScore.toFixed(1))) };
}
