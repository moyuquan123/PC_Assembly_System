export const categoryCodes = [
  "cpu",
  "motherboard",
  "gpu",
  "memory",
  "storage",
  "psu",
  "case",
  "cooler"
] as const;

export type CategoryCode = (typeof categoryCodes)[number];
export type Usage = "游戏" | "办公" | "内容创作";
export type PartStatus = "active" | "inactive";
export type CompatibilityLevel = "compatible" | "warning" | "incompatible";

export interface Category {
  code: CategoryCode;
  name: string;
  shortName: string;
  sortOrder: number;
}

export interface CpuSpecs {
  kind: "cpu";
  socket: string;
  chipsetFamilies: string[];
  tdpW: number;
  maxPowerW: number;
  generation: string;
}

export interface MotherboardSpecs {
  kind: "motherboard";
  socket: string;
  chipset: string;
  memoryType: "DDR4" | "DDR5";
  formFactor: "ATX" | "M-ATX" | "ITX";
  biosReviewGenerations: string[];
  powerW: number;
}

export interface MemorySpecs {
  kind: "memory";
  memoryType: "DDR4" | "DDR5";
  capacityMb: number;
  moduleCount: number;
  powerW: number;
}

export interface GpuSpecs {
  kind: "gpu";
  lengthMm: number;
  powerW: number;
}

export interface CaseSpecs {
  kind: "case";
  supportedFormFactors: Array<"ATX" | "M-ATX" | "ITX">;
  maxGpuLengthMm: number;
  maxCoolerHeightMm: number;
}

export interface CoolerSpecs {
  kind: "cooler";
  heightMm: number;
  supportedSockets: string[];
  powerW: number;
}

export interface PsuSpecs {
  kind: "psu";
  ratedPowerW: number;
  efficiency: string;
  modular: string;
}

export interface StorageSpecs {
  kind: "storage";
  interface: string;
  capacityGb: number;
  powerW: number;
}

export type PartSpecs =
  | CpuSpecs
  | MotherboardSpecs
  | MemorySpecs
  | GpuSpecs
  | CaseSpecs
  | CoolerSpecs
  | PsuSpecs
  | StorageSpecs;

export interface Part {
  id: string;
  category: CategoryCode;
  brand: string;
  model: string;
  name: string;
  priceFen: number;
  imageUrl: string;
  status: PartStatus;
  updatedAt: string;
  displaySpecs: string[];
  specs: PartSpecs;
}

export interface BuildDraft {
  schemaVersion: 1;
  name: string;
  budgetFen: number;
  usage: Usage;
  selectedPartIds: Partial<Record<CategoryCode, string>>;
  updatedAt: string;
}

export interface BuildSnapshot {
  name: string;
  budgetFen: number;
  usage: Usage;
  parts: Part[];
}

export interface CompatibilityResult {
  ruleId: string;
  ruleVersion: string;
  level: CompatibilityLevel;
  message: string;
  relatedPartIds: string[];
  details?: Record<string, unknown>;
}

export interface BuildSummary {
  totalFen: number;
  estimatedPowerW: number;
  requiredPsuPowerW: number;
  progress: number;
  parts: Part[];
}
