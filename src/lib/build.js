import { categories, partsByCategory } from "../data/parts";

export function getSelectedParts(selection) {
  return categories.flatMap((category) => {
    const selectedId = selection[category.id];
    const part = partsByCategory[category.id].find(
      (candidate) => candidate.id === selectedId,
    );

    return part ? [{ ...part, categoryId: category.id }] : [];
  });
}

export function calculateBuild(selection) {
  const selectedParts = getSelectedParts(selection);
  const total = selectedParts.reduce((sum, part) => sum + part.price, 0);
  const componentPower = selectedParts.reduce(
    (sum, part) => sum + (part.power ?? 0),
    0,
  );
  const estimatedPower = componentPower === 0 ? 0 : componentPower + 55;

  return {
    selectedParts,
    total,
    estimatedPower,
    progress: selectedParts.length,
  };
}

export function checkCompatibility(selection) {
  const selected = Object.fromEntries(
    getSelectedParts(selection).map((part) => [part.categoryId, part]),
  );
  const issues = [];

  if (
    selected.cpu &&
    selected.motherboard &&
    selected.cpu.socket !== selected.motherboard.socket
  ) {
    issues.push({
      level: "error",
      message: `CPU 使用 ${selected.cpu.socket}，但主板使用 ${selected.motherboard.socket} 插槽。`,
    });
  }

  if (
    selected.motherboard &&
    selected.memory &&
    selected.motherboard.memoryType !== selected.memory.memoryType
  ) {
    issues.push({
      level: "error",
      message: `主板支持 ${selected.motherboard.memoryType}，当前内存为 ${selected.memory.memoryType}。`,
    });
  }

  if (
    selected.motherboard &&
    selected.case &&
    !selected.case.supportedForms.includes(selected.motherboard.formFactor)
  ) {
    issues.push({
      level: "error",
      message: `机箱不支持 ${selected.motherboard.formFactor} 主板。`,
    });
  }

  if (
    selected.gpu &&
    selected.case &&
    selected.gpu.length > selected.case.maxGpuLength
  ) {
    issues.push({
      level: "error",
      message: `显卡长度 ${selected.gpu.length}mm，超过机箱限长 ${selected.case.maxGpuLength}mm。`,
    });
  }

  if (
    selected.cpu &&
    selected.cooler &&
    !selected.cooler.supportedSockets.includes(selected.cpu.socket)
  ) {
    issues.push({
      level: "error",
      message: `散热器不支持 ${selected.cpu.socket} 插槽。`,
    });
  }

  if (
    selected.cooler &&
    selected.case &&
    selected.cooler.height > selected.case.maxCoolerHeight
  ) {
    issues.push({
      level: "error",
      message: `散热器高度 ${selected.cooler.height}mm，超过机箱限高 ${selected.case.maxCoolerHeight}mm。`,
    });
  }

  const { estimatedPower } = calculateBuild(selection);
  if (selected.psu && estimatedPower > 0) {
    if (selected.psu.wattage < estimatedPower) {
      issues.push({
        level: "error",
        message: `预计功耗 ${estimatedPower}W，已超过电源额定功率。`,
      });
    } else if (selected.psu.wattage < estimatedPower * 1.35) {
      issues.push({
        level: "warning",
        message: "电源可以使用，但功率余量偏低。",
      });
    }
  }

  return issues;
}

export function getProductCompatibility(categoryId, product, selection) {
  const nextSelection = { ...selection, [categoryId]: product.id };
  const issues = checkCompatibility(nextSelection);
  const productIssues = issues.filter((issue) => {
    if (categoryId === "psu") return issue.message.includes("电源");
    if (categoryId === "case") {
      return issue.message.includes("机箱") || issue.message.includes("限");
    }
    if (categoryId === "cooler") return issue.message.includes("散热器");
    if (categoryId === "memory") return issue.message.includes("内存");
    if (categoryId === "motherboard" || categoryId === "cpu") {
      return issue.message.includes("插槽") || issue.message.includes("主板");
    }
    if (categoryId === "gpu") return issue.message.includes("显卡");
    return false;
  });

  return productIssues[0] ?? null;
}
