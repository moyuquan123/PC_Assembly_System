import { describe, expect, it } from "vitest";
import { categories, seedParts } from "@pc-assembly/domain";
import { configurationClasses, createConfigurationLibrary } from "./configuration-library";

describe("configuration library", () => {
  it("builds complete market-style configurations for both platforms and every class", () => {
    const configurations = createConfigurationLibrary(seedParts);

    expect(configurations).toHaveLength(8);
    expect(new Set(configurations.map((item) => item.platform))).toEqual(new Set(["AMD", "Intel"]));
    expect(new Set(configurations.map((item) => item.configurationClass))).toEqual(new Set(configurationClasses));
    expect(configurations.every((item) => item.summary.parts.length === categories.length)).toBe(true);
    expect(configurations.every((item) => item.checks.every((check) => check.level !== "incompatible"))).toBe(true);
  });

  it("omits a configuration when its source catalog is incomplete", () => {
    const configurations = createConfigurationLibrary(seedParts.filter((part) => part.id !== "cpu-7600x"));
    expect(configurations.some((item) => item.id === "amd-office-entry")).toBe(false);
    expect(configurations.some((item) => item.id === "amd-mainstream-gaming")).toBe(false);
  });
});
