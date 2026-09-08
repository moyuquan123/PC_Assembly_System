import type {
  BuildSnapshot,
  BuildSummary,
  CategoryCode,
  CompatibilityLevel,
  CompatibilityResult,
  Part,
  PartSpecs
} from "./types.js";

export const RULE_VERSION = "2026.09.1";
export const PSU_HEADROOM_RATIO = 1.35;
export const BASE_SYSTEM_POWER_W = 55;

const levelOrder: Record<CompatibilityLevel, number> = {
  incompatible: 0,
  warning: 1,
  compatible: 2
};

function findPart(snapshot: BuildSnapshot, category: CategoryCode): Part | undefined {
  return snapshot.parts.find((part) => part.category === category);
}

function withKind<TKind extends PartSpecs["kind"]>(
  part: Part | undefined,
  kind: TKind
): (Part & { specs: Extract<PartSpecs, { kind: TKind }> }) | undefined {
  if (!part || part.specs.kind !== kind) return undefined;
  return part as Part & { specs: Extract<PartSpecs, { kind: TKind }> };
}

function result(
  ruleId: string,
  level: CompatibilityLevel,
  message: string,
  parts: Part[],
  details?: Record<string, unknown>
): CompatibilityResult {
  return {
    ruleId,
    ruleVersion: RULE_VERSION,
    level,
    message,
    relatedPartIds: parts.map((part) => part.id),
    ...(details ? { details } : {})
  };
}

function pairResult(
  ruleId: string,
  passed: boolean,
  successMessage: string,
  failureMessage: string,
  parts: Part[],
  details?: Record<string, unknown>
): CompatibilityResult {
  return result(ruleId, passed ? "compatible" : "incompatible", passed ? successMessage : failureMessage, parts, details);
}

export function estimatePower(parts: Part[]): number {
  const componentPower = parts.reduce((total, part) => {
    const specs = part.specs;
    if (specs.kind === "cpu") return total + specs.maxPowerW;
    if ("powerW" in specs) return total + specs.powerW;
    return total;
  }, 0);
  return parts.length === 0 ? 0 : componentPower + BASE_SYSTEM_POWER_W;
}

export function summarizeBuild(snapshot: BuildSnapshot): BuildSummary {
  const estimatedPowerW = estimatePower(snapshot.parts);
  return {
    totalFen: snapshot.parts.reduce((total, part) => total + part.priceFen, 0),
    estimatedPowerW,
    requiredPsuPowerW: Math.ceil(estimatedPowerW * PSU_HEADROOM_RATIO),
    progress: new Set(snapshot.parts.map((part) => part.category)).size,
    parts: snapshot.parts
  };
}

export function checkCompatibility(snapshot: BuildSnapshot): CompatibilityResult[] {
  const cpu = withKind(findPart(snapshot, "cpu"), "cpu");
  const motherboard = withKind(findPart(snapshot, "motherboard"), "motherboard");
  const memory = withKind(findPart(snapshot, "memory"), "memory");
  const gpu = withKind(findPart(snapshot, "gpu"), "gpu");
  const pcCase = withKind(findPart(snapshot, "case"), "case");
  const cooler = withKind(findPart(snapshot, "cooler"), "cooler");
  const psu = withKind(findPart(snapshot, "psu"), "psu");
  const results: CompatibilityResult[] = [];

  if (cpu && motherboard) {
    results.push(pairResult(
      "cpu-motherboard-socket",
      cpu.specs.socket === motherboard.specs.socket,
      `CPU 与主板均使用 ${cpu.specs.socket} 插槽。`,
      `CPU 使用 ${cpu.specs.socket}，但主板使用 ${motherboard.specs.socket} 插槽。`,
      [cpu, motherboard]
    ));

    const chipsetSupported = cpu.specs.chipsetFamilies.includes(motherboard.specs.chipset);
    results.push(pairResult(
      "cpu-chipset-support",
      chipsetSupported,
      `${motherboard.specs.chipset} 芯片组支持当前 CPU。`,
      `${motherboard.specs.chipset} 芯片组不支持当前 CPU 型号。`,
      [cpu, motherboard]
    ));

    if (chipsetSupported && motherboard.specs.biosReviewGenerations.includes(cpu.specs.generation)) {
      results.push(result(
        "bios-version-review",
        "warning",
        "该 CPU 与主板组合可能需要更新 BIOS，请核对厂商支持列表。",
        [cpu, motherboard]
      ));
    }
  }

  if (motherboard && memory) {
    results.push(pairResult(
      "motherboard-memory-generation",
      motherboard.specs.memoryType === memory.specs.memoryType,
      `主板与内存均为 ${memory.specs.memoryType}。`,
      `主板支持 ${motherboard.specs.memoryType}，当前内存为 ${memory.specs.memoryType}。`,
      [motherboard, memory]
    ));
  }

  if (motherboard && pcCase) {
    results.push(pairResult(
      "case-motherboard-form-factor",
      pcCase.specs.supportedFormFactors.includes(motherboard.specs.formFactor),
      `机箱支持 ${motherboard.specs.formFactor} 主板。`,
      `机箱不支持 ${motherboard.specs.formFactor} 主板。`,
      [motherboard, pcCase]
    ));
  }

  if (gpu && pcCase) {
    results.push(pairResult(
      "case-gpu-clearance",
      gpu.specs.lengthMm <= pcCase.specs.maxGpuLengthMm,
      `显卡长度 ${gpu.specs.lengthMm}mm，未超过机箱限长。`,
      `显卡长度 ${gpu.specs.lengthMm}mm，超过机箱限长 ${pcCase.specs.maxGpuLengthMm}mm。`,
      [gpu, pcCase],
      { actualMm: gpu.specs.lengthMm, limitMm: pcCase.specs.maxGpuLengthMm }
    ));
  }

  if (cpu && cooler) {
    results.push(pairResult(
      "cooler-cpu-socket",
      cooler.specs.supportedSockets.includes(cpu.specs.socket),
      `散热器支持 ${cpu.specs.socket} 插槽。`,
      `散热器不支持 ${cpu.specs.socket} 插槽。`,
      [cpu, cooler]
    ));
  }

  if (cooler && pcCase) {
    results.push(pairResult(
      "case-cooler-clearance",
      cooler.specs.heightMm <= pcCase.specs.maxCoolerHeightMm,
      `散热器高度 ${cooler.specs.heightMm}mm，未超过机箱限高。`,
      `散热器高度 ${cooler.specs.heightMm}mm，超过机箱限高 ${pcCase.specs.maxCoolerHeightMm}mm。`,
      [cooler, pcCase],
      { actualMm: cooler.specs.heightMm, limitMm: pcCase.specs.maxCoolerHeightMm }
    ));
  }

  if (psu) {
    const powerWithoutPsu = estimatePower(snapshot.parts.filter((part) => part.category !== "psu"));
    const required = Math.ceil(powerWithoutPsu * PSU_HEADROOM_RATIO);
    if (powerWithoutPsu > 0) {
      const level: CompatibilityLevel = psu.specs.ratedPowerW < powerWithoutPsu
        ? "incompatible"
        : psu.specs.ratedPowerW < required
          ? "warning"
          : "compatible";
      const message = level === "incompatible"
        ? `预计功耗 ${powerWithoutPsu}W，已超过电源额定功率 ${psu.specs.ratedPowerW}W。`
        : level === "warning"
          ? `电源可以使用，但未达到建议的 35% 功率余量（建议至少 ${required}W）。`
          : `电源额定功率覆盖预计功耗并保留至少 35% 余量。`;
      results.push(result("psu-power-headroom", level, message, [psu], {
        estimatedPowerW: powerWithoutPsu,
        requiredPowerW: required,
        ratedPowerW: psu.specs.ratedPowerW
      }));
    }
  }

  return results.toSorted((a, b) => levelOrder[a.level] - levelOrder[b.level] || a.ruleId.localeCompare(b.ruleId));
}

export function checkCandidate(snapshot: BuildSnapshot, candidate: Part): CompatibilityResult[] {
  const parts = snapshot.parts.filter((part) => part.category !== candidate.category).concat(candidate);
  return checkCompatibility({ ...snapshot, parts }).filter((item) => item.relatedPartIds.includes(candidate.id));
}
