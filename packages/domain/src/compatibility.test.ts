import { describe, expect, it } from "vitest";
import { checkCompatibility, estimatePower, summarizeBuild } from "./compatibility.js";
import { getPartsByIds, seedParts } from "./catalog.js";
import type { BuildSnapshot, CategoryCode } from "./types.js";

function snapshot(selectedPartIds: Partial<Record<CategoryCode, string>>): BuildSnapshot {
  return { name: "测试配置", budgetFen: 800_000, usage: "游戏", parts: getPartsByIds(selectedPartIds) };
}

describe("compatibility engine", () => {
  it.each([
    ["same CPU socket", { cpu: "cpu-7600x", motherboard: "mb-b650" }, "cpu-motherboard-socket", "compatible"],
    ["different CPU socket", { cpu: "cpu-14600kf", motherboard: "mb-b650" }, "cpu-motherboard-socket", "incompatible"],
    ["DDR generation mismatch", { motherboard: "mb-b760-d4", memory: "ram-fury" }, "motherboard-memory-generation", "incompatible"],
    ["case form factor mismatch", { motherboard: "mb-b650-a", case: "case-nr200" }, "case-motherboard-form-factor", "incompatible"],
    ["GPU equals case limit", { gpu: "gpu-7800xt", case: "case-nr200" }, "case-gpu-clearance", "compatible"],
    ["GPU exceeds case limit", { gpu: "gpu-4080s", case: "case-a4h2o" }, "case-gpu-clearance", "incompatible"],
    ["cooler socket mismatch", { cpu: "cpu-7600x", cooler: "cooler-l9i" }, "cooler-cpu-socket", "incompatible"],
    ["cooler equals/under case limit", { cooler: "cooler-l9a", case: "case-a4h2o" }, "case-cooler-clearance", "compatible"],
    ["cooler exceeds case limit", { cooler: "cooler-pa120", case: "case-a4h2o" }, "case-cooler-clearance", "incompatible"]
  ] as const)("checks %s", (_name, ids, ruleId, level) => {
    const rule = checkCompatibility(snapshot(ids)).find((item) => item.ruleId === ruleId);
    expect(rule?.level).toBe(level);
  });

  it("returns a BIOS review warning for a newer CPU generation", () => {
    const results = checkCompatibility(snapshot({ cpu: "cpu-9600x", motherboard: "mb-b650" }));
    expect(results).toContainEqual(expect.objectContaining({ ruleId: "bios-version-review", level: "warning" }));
  });

  it.each([
    ["insufficient", "psu-v550", "incompatible"],
    ["limited headroom", "psu-g7", "warning"],
    ["sufficient", "psu-focus1000", "compatible"]
  ] as const)("classifies PSU headroom: %s", (_name, psu, level) => {
    const results = checkCompatibility(snapshot({ cpu: "cpu-14700f", motherboard: "mb-z790", gpu: "gpu-4080s", memory: "ram-z5", storage: "ssd-990pro", psu, case: "case-lancool", cooler: "cooler-ak620" }));
    expect(results.find((item) => item.ruleId === "psu-power-headroom")?.level).toBe(level);
  });

  it("keeps multiple results complete and severity order stable", () => {
    const results = checkCompatibility(snapshot({ cpu: "cpu-14600kf", motherboard: "mb-b650", memory: "ram-ddr4", case: "case-nr200", cooler: "cooler-l9a" }));
    expect(results.filter((item) => item.level === "incompatible").length).toBeGreaterThanOrEqual(3);
    expect(results.map((item) => item.level)).toEqual(results.map((item) => item.level).toSorted((a, b) => ({ incompatible: 0, warning: 1, compatible: 2 })[a] - ({ incompatible: 0, warning: 1, compatible: 2 })[b]));
  });
});

describe("build calculations", () => {
  it("uses integer cents and conservative peak power", () => {
    const build = summarizeBuild(snapshot({ cpu: "cpu-7600x", motherboard: "mb-b650", gpu: "gpu-4060ti", memory: "ram-fury", storage: "ssd-tiplus", psu: "psu-g7" }));
    expect(build.totalFen).toBe(755_400);
    expect(build.progress).toBe(6);
    expect(build.estimatedPowerW).toBe(421);
    expect(build.requiredPsuPowerW).toBe(569);
  });

  it("returns zero power for an empty build", () => {
    expect(estimatePower([])).toBe(0);
  });

  it("ships 50 to 100 active seed parts across all eight categories", () => {
    expect(seedParts.length).toBeGreaterThanOrEqual(50);
    expect(seedParts.length).toBeLessThanOrEqual(100);
    expect(new Set(seedParts.map((part) => part.category)).size).toBe(8);
  });
});
