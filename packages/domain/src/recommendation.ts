import { checkCompatibility, estimatePower, summarizeBuild } from "./compatibility.js";
import { categoryCodes } from "./types.js";
import type {
  BuildSnapshot,
  CategoryCode,
  CompatibilityResult,
  Part,
  Usage
} from "./types.js";

export const RECOMMENDATION_VERSION = "2026.09.1";

export type RecommendationStrategy = "balanced" | "performance" | "value";

export interface RecommendationPreferences {
  compact?: boolean | undefined;
  quiet?: boolean | undefined;
  upgradeFriendly?: boolean | undefined;
}

export interface RecommendationInput {
  budgetFen: number;
  usage: Usage;
  preferences?: RecommendationPreferences;
}

export interface RecommendedBuild {
  strategy: RecommendationStrategy;
  label: string;
  selectedPartIds: Record<CategoryCode, string>;
  parts: Part[];
  summary: ReturnType<typeof summarizeBuild>;
  checks: CompatibilityResult[];
  score: number;
  reasons: string[];
  tradeoffs: string[];
}

type RankedCandidate = Omit<RecommendedBuild, "strategy" | "label" | "reasons" | "tradeoffs"> & {
  signature: string;
};

const strategyLabels: Record<RecommendationStrategy, string> = {
  balanced: "均衡方案",
  performance: "性能优先",
  value: "性价比优先"
};

const strategyTargetRatio: Record<RecommendationStrategy, number> = {
  balanced: 0.9,
  performance: 0.99,
  value: 0.76
};

const cpuPerformance: Record<string, number> = {
  "cpu-14400f": 56,
  "cpu-7600x": 64,
  "cpu-9600x": 70,
  "cpu-14600kf": 76,
  "cpu-7700": 80,
  "cpu-7800x3d": 92,
  "cpu-14700f": 94
};

const gpuPerformance: Record<string, number> = {
  "gpu-a770": 48,
  "gpu-4060": 50,
  "gpu-4060ti": 62,
  "gpu-7700xt": 70,
  "gpu-7800xt": 80,
  "gpu-4070s": 84,
  "gpu-4080s": 100
};

const usageWeights: Record<Usage, { cpu: number; gpu: number; memory: number; storage: number }> = {
  游戏: { cpu: 0.28, gpu: 0.55, memory: 0.1, storage: 0.07 },
  办公: { cpu: 0.4, gpu: 0.08, memory: 0.26, storage: 0.26 },
  内容创作: { cpu: 0.38, gpu: 0.33, memory: 0.17, storage: 0.12 }
};

function compatible(...parts: Part[]): boolean {
  const snapshot: BuildSnapshot = { name: "推荐候选", budgetFen: 200_000, usage: "游戏", parts };
  return !checkCompatibility(snapshot).some((result) => result.level === "incompatible");
}

function closestPart(parts: Part[], targetFen: number, preferHigher: boolean): Part {
  return parts.toSorted((a, b) => {
    const aDistance = Math.abs(a.priceFen - targetFen);
    const bDistance = Math.abs(b.priceFen - targetFen);
    if (aDistance !== bDistance) return aDistance - bDistance;
    return preferHigher ? b.priceFen - a.priceFen : a.priceFen - b.priceFen;
  })[0]!;
}

function chooseStorage(parts: Part[], input: RecommendationInput, strategy: RecommendationStrategy): Part {
  const ratio = input.usage === "办公" ? 0.15 : input.usage === "内容创作" ? 0.13 : 0.09;
  const strategyFactor = strategy === "performance" ? 1.2 : strategy === "value" ? 0.75 : 1;
  return closestPart(parts, input.budgetFen * ratio * strategyFactor, strategy === "performance");
}

function choosePsu(parts: Part[], buildWithoutPsu: Part[], strategy: RecommendationStrategy): Part | undefined {
  const requiredPowerW = Math.ceil(estimatePower(buildWithoutPsu) * 1.35);
  const sufficient = parts.filter((part) => part.specs.kind === "psu" && part.specs.ratedPowerW >= requiredPowerW);
  if (sufficient.length === 0) return undefined;
  if (strategy === "value") return sufficient.toSorted((a, b) => a.priceFen - b.priceFen)[0];
  const extraHeadroomW = strategy === "performance" ? 125 : 75;
  const targetPowerW = requiredPowerW + extraHeadroomW;
  return sufficient.toSorted((a, b) => {
    const aPower = a.specs.kind === "psu" ? a.specs.ratedPowerW : 0;
    const bPower = b.specs.kind === "psu" ? b.specs.ratedPowerW : 0;
    return Math.abs(aPower - targetPowerW) - Math.abs(bPower - targetPowerW) || a.priceFen - b.priceFen;
  })[0];
}

function normalizedCapacity(part: Part): number {
  if (part.specs.kind === "memory") return Math.min(100, part.specs.capacityMb / 655.36);
  if (part.specs.kind === "storage") {
    const interfaceBonus = part.specs.interface.includes("4.0") ? 12 : part.specs.interface.includes("3.0") ? 6 : 0;
    return Math.min(100, part.specs.capacityGb / 24 + interfaceBonus);
  }
  return 50;
}

function usagePerformance(parts: Part[], usage: Usage): number {
  const cpu = parts.find((part) => part.category === "cpu");
  const gpu = parts.find((part) => part.category === "gpu");
  const memory = parts.find((part) => part.category === "memory");
  const storage = parts.find((part) => part.category === "storage");
  const weights = usageWeights[usage];
  return (cpuPerformance[cpu?.id ?? ""] ?? 50) * weights.cpu
    + (gpuPerformance[gpu?.id ?? ""] ?? 50) * weights.gpu
    + normalizedCapacity(memory!) * weights.memory
    + normalizedCapacity(storage!) * weights.storage;
}

function preferenceBonus(parts: Part[], preferences: RecommendationPreferences): number {
  const motherboard = parts.find((part) => part.category === "motherboard");
  const pcCase = parts.find((part) => part.category === "case");
  const psu = parts.find((part) => part.category === "psu");
  let bonus = 0;
  if (preferences.compact && pcCase?.specs.kind === "case" && pcCase.specs.maxGpuLengthMm <= 345) bonus += 8;
  if (preferences.quiet) bonus += Math.max(0, 8 - estimatePower(parts) / 100);
  if (preferences.upgradeFriendly && motherboard?.specs.kind === "motherboard") {
    if (motherboard.specs.socket === "AM5") bonus += 7;
    if (motherboard.specs.memoryType === "DDR5") bonus += 3;
  }
  if (preferences.upgradeFriendly && psu?.specs.kind === "psu" && psu.specs.ratedPowerW >= 850) bonus += 3;
  return bonus;
}

function candidateScore(parts: Part[], input: RecommendationInput, strategy: RecommendationStrategy): number {
  const totalFen = parts.reduce((sum, part) => sum + part.priceFen, 0);
  const spendRatio = totalFen / input.budgetFen;
  const overBudgetPenalty = spendRatio > 1 ? (spendRatio - 1) * 900 : 0;
  const targetPenalty = Math.abs(spendRatio - strategyTargetRatio[strategy]) * (strategy === "performance" ? 65 : 105);
  const performanceWeight = strategy === "performance" ? 1.25 : strategy === "balanced" ? 0.92 : 0.7;
  const valueBonus = strategy === "value" ? usagePerformance(parts, input.usage) / Math.max(1, totalFen / 100_000) : 0;
  return usagePerformance(parts, input.usage) * performanceWeight
    + valueBonus
    + preferenceBonus(parts, input.preferences ?? {})
    - targetPenalty
    - overBudgetPenalty;
}

function addTopCandidate(list: RankedCandidate[], candidate: RankedCandidate): void {
  const existing = list.findIndex((item) => item.signature === candidate.signature);
  if (existing >= 0 && list[existing]!.score >= candidate.score) return;
  if (existing >= 0) list.splice(existing, 1);
  list.push(candidate);
  list.sort((a, b) => b.score - a.score || a.signature.localeCompare(b.signature));
  if (list.length > 12) list.length = 12;
}

function recommendationCopy(strategy: RecommendationStrategy, build: RankedCandidate, input: RecommendationInput): Pick<RecommendedBuild, "reasons" | "tradeoffs"> {
  const totalDifference = input.budgetFen - build.summary.totalFen;
  const reasons = [
    strategy === "performance"
      ? `优先把预算投入到对${input.usage}体验影响更大的处理器和显卡。`
      : strategy === "value"
        ? "保留更多预算余量，并优先选择满足需求的主流部件。"
        : "在核心性能、容量、供电余量和整机价格之间保持平衡。",
    `整机预计功耗 ${build.summary.estimatedPowerW}W，电源建议需求 ${build.summary.requiredPsuPowerW}W。`
  ];
  const tradeoffs = totalDifference >= 0
    ? [`比预算少使用 ¥${Math.round(totalDifference / 100)}，可留作显示器、风扇或价格波动余量。`]
    : [`当前方案超出预算 ¥${Math.round(Math.abs(totalDifference) / 100)}，建议替换显卡或处理器。`];
  if (input.preferences?.quiet) tradeoffs.push("静音偏好目前按整机功耗估算，购买前仍需核对散热器和风扇实测噪音。");
  return { reasons, tradeoffs };
}

export function recommendBuilds(allParts: Part[], input: RecommendationInput): RecommendedBuild[] {
  const activeParts = allParts.filter((part) => part.status === "active");
  const byCategory = new Map(categoryCodes.map((category) => [category, activeParts.filter((part) => part.category === category)]));
  if (categoryCodes.some((category) => (byCategory.get(category)?.length ?? 0) === 0)) return [];

  const topByStrategy: Record<RecommendationStrategy, RankedCandidate[]> = {
    balanced: [], performance: [], value: []
  };
  const strategies = Object.keys(topByStrategy) as RecommendationStrategy[];

  for (const cpu of byCategory.get("cpu")!) {
    for (const motherboard of byCategory.get("motherboard")!) {
      if (!compatible(cpu, motherboard)) continue;
      for (const memory of byCategory.get("memory")!) {
        if (!compatible(motherboard, memory)) continue;
        for (const gpu of byCategory.get("gpu")!) {
          for (const pcCase of byCategory.get("case")!) {
            if (!compatible(motherboard, pcCase) || !compatible(gpu, pcCase)) continue;
            for (const cooler of byCategory.get("cooler")!) {
              if (!compatible(cpu, cooler) || !compatible(cooler, pcCase)) continue;
              const baseParts = [cpu, motherboard, gpu, memory, pcCase, cooler];
              for (const strategy of strategies) {
                const storage = chooseStorage(byCategory.get("storage")!, input, strategy);
                const withoutPsu = [...baseParts, storage];
                const psu = choosePsu(byCategory.get("psu")!, withoutPsu, strategy);
                if (!psu) continue;
                const unordered = [...withoutPsu, psu];
                const parts = categoryCodes.map((category) => unordered.find((part) => part.category === category)!);
                const snapshot: BuildSnapshot = { name: strategyLabels[strategy], budgetFen: input.budgetFen, usage: input.usage, parts };
                const checks = checkCompatibility(snapshot);
                if (checks.some((check) => check.level === "incompatible")) continue;
                const summary = summarizeBuild(snapshot);
                const signature = parts.map((part) => part.id).join("|");
                addTopCandidate(topByStrategy[strategy], {
                  signature,
                  selectedPartIds: Object.fromEntries(parts.map((part) => [part.category, part.id])) as Record<CategoryCode, string>,
                  parts,
                  summary,
                  checks,
                  score: Math.round(candidateScore(parts, input, strategy) * 100) / 100
                });
              }
            }
          }
        }
      }
    }
  }

  const usedSignatures = new Set<string>();
  return (["balanced", "performance", "value"] as RecommendationStrategy[]).flatMap((strategy) => {
    const candidate = topByStrategy[strategy].find((item) => !usedSignatures.has(item.signature)) ?? topByStrategy[strategy][0];
    if (!candidate) return [];
    usedSignatures.add(candidate.signature);
    const copy = recommendationCopy(strategy, candidate, input);
    return [{
      strategy,
      label: strategyLabels[strategy],
      selectedPartIds: candidate.selectedPartIds,
      parts: candidate.parts,
      summary: candidate.summary,
      checks: candidate.checks,
      score: candidate.score,
      ...copy
    }];
  });
}
