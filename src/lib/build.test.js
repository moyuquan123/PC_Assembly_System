import { describe, expect, it } from "vitest";
import { calculateBuild, checkCompatibility } from "./build";
import { demoSelection } from "../data/parts";

describe("build calculations", () => {
  it("calculates price, progress, and estimated power", () => {
    const result = calculateBuild(demoSelection);

    expect(result.total).toBe(7554);
    expect(result.progress).toBe(6);
    expect(result.estimatedPower).toBe(384);
  });

  it("detects CPU and motherboard socket conflicts", () => {
    const issues = checkCompatibility({
      cpu: "cpu-14600kf",
      motherboard: "mb-b650",
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ level: "error" }),
    );
    expect(issues[0].message).toContain("LGA1700");
    expect(issues[0].message).toContain("AM5");
  });

  it("warns when the selected PSU has limited headroom", () => {
    const issues = checkCompatibility({
      cpu: "cpu-14600kf",
      motherboard: "mb-b760",
      gpu: "gpu-7800xt",
      memory: "ram-fury",
      storage: "ssd-sn850x",
      psu: "psu-g7",
      case: "case-lancool",
      cooler: "cooler-ak620",
    });

    expect(issues).toContainEqual({
      level: "warning",
      message: "电源可以使用，但功率余量偏低。",
    });
  });
});
