import { categories, checkCompatibility, getPartsByIds, summarizeBuild } from "@pc-assembly/domain";
import type { BuildSummary, CategoryCode, CompatibilityResult, Part } from "@pc-assembly/domain";

export const configurationClasses = ["办公入门", "主流游戏", "高性能游戏", "内容创作"] as const;
export type ConfigurationClass = (typeof configurationClasses)[number];
export type PlatformBrand = "AMD" | "Intel";

export interface MarketConfiguration {
  id: string;
  engagementKey: string;
  name: string;
  platform: PlatformBrand;
  configurationClass: ConfigurationClass;
  selectedPartIds: Partial<Record<CategoryCode, string>>;
  summary: BuildSummary;
  checks: CompatibilityResult[];
  referenceBudgetFen: number;
  source: "official" | "community";
  authorName: string;
  description: string;
  createdAt?: string;
}

interface ConfigurationDefinition {
  id: string;
  name: string;
  platform: PlatformBrand;
  configurationClass: ConfigurationClass;
  selectedPartIds: Partial<Record<CategoryCode, string>>;
}

const definitions: ConfigurationDefinition[] = [
  { id: "amd-office-entry", name: "AMD 入门办公配置", platform: "AMD", configurationClass: "办公入门", selectedPartIds: { cpu: "cpu-7600x", motherboard: "mb-a620", gpu: "gpu-4060", memory: "ram-kingbank", storage: "ssd-p3", psu: "psu-k650", case: "case-air100", cooler: "cooler-pa120" } },
  { id: "intel-office-entry", name: "Intel 入门办公配置", platform: "Intel", configurationClass: "办公入门", selectedPartIds: { cpu: "cpu-14400f", motherboard: "mb-b760-d4", gpu: "gpu-4060", memory: "ram-ddr4", storage: "ssd-rc20", psu: "psu-k650", case: "case-air100", cooler: "cooler-pa120" } },
  { id: "amd-mainstream-gaming", name: "AMD 主流游戏配置", platform: "AMD", configurationClass: "主流游戏", selectedPartIds: { cpu: "cpu-7600x", motherboard: "mb-b650", gpu: "gpu-4060ti", memory: "ram-fury", storage: "ssd-tiplus", psu: "psu-g7", case: "case-air100", cooler: "cooler-pa120" } },
  { id: "intel-mainstream-gaming", name: "Intel 主流游戏配置", platform: "Intel", configurationClass: "主流游戏", selectedPartIds: { cpu: "cpu-14600kf", motherboard: "mb-z790", gpu: "gpu-4060ti", memory: "ram-fury", storage: "ssd-sn850x", psu: "psu-g7", case: "case-lancool", cooler: "cooler-ak620" } },
  { id: "amd-high-end-gaming", name: "AMD 高性能游戏配置", platform: "AMD", configurationClass: "高性能游戏", selectedPartIds: { cpu: "cpu-7800x3d", motherboard: "mb-x670", gpu: "gpu-4080s", memory: "ram-z5", storage: "ssd-990pro", psu: "psu-focus1000", case: "case-lancool", cooler: "cooler-assassin4" } },
  { id: "intel-high-end-gaming", name: "Intel 高性能游戏配置", platform: "Intel", configurationClass: "高性能游戏", selectedPartIds: { cpu: "cpu-14700f", motherboard: "mb-z790", gpu: "gpu-4080s", memory: "ram-z5-64", storage: "ssd-990pro", psu: "psu-focus1000", case: "case-lancool", cooler: "cooler-assassin4" } },
  { id: "amd-content-creation", name: "AMD 内容创作配置", platform: "AMD", configurationClass: "内容创作", selectedPartIds: { cpu: "cpu-7700", motherboard: "mb-x670", gpu: "gpu-7800xt", memory: "ram-z5-64", storage: "ssd-p44", psu: "psu-gx3", case: "case-lancool", cooler: "cooler-ak620" } },
  { id: "intel-content-creation", name: "Intel 内容创作配置", platform: "Intel", configurationClass: "内容创作", selectedPartIds: { cpu: "cpu-14700f", motherboard: "mb-z790", gpu: "gpu-4070s", memory: "ram-z5-64", storage: "ssd-p44", psu: "psu-gx3", case: "case-lancool", cooler: "cooler-assassin4" } }
];

export function createConfigurationLibrary(catalog: Part[]): MarketConfiguration[] {
  return definitions.flatMap((definition) => {
    const parts = getPartsByIds(definition.selectedPartIds, catalog);
    if (parts.length !== categories.length) return [];
    const snapshot = { name: definition.name, budgetFen: Number.MAX_SAFE_INTEGER, usage: usageForClass(definition.configurationClass), parts };
    const summary = summarizeBuild(snapshot);
    return [{
      ...definition,
      engagementKey: `official:${definition.id}`,
      summary,
      checks: checkCompatibility(snapshot),
      referenceBudgetFen: Math.ceil(summary.totalFen / 50_000) * 50_000,
      source: "official" as const,
      authorName: "官方",
      description: "由当前配件库生成并通过兼容性规则复核。"
    }];
  }).toSorted((left, right) => left.summary.totalFen - right.summary.totalFen);
}

function usageForClass(configurationClass: ConfigurationClass) {
  if (configurationClass === "办公入门") return "办公" as const;
  if (configurationClass === "内容创作") return "内容创作" as const;
  return "游戏" as const;
}
