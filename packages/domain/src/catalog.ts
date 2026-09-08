import type { Category, CategoryCode, Part, PartSpecs } from "./types.js";

export const categories: Category[] = [
  { code: "cpu", name: "处理器 CPU", shortName: "CPU", sortOrder: 1 },
  { code: "motherboard", name: "主板", shortName: "主板", sortOrder: 2 },
  { code: "gpu", name: "显卡", shortName: "显卡", sortOrder: 3 },
  { code: "memory", name: "内存", shortName: "内存", sortOrder: 4 },
  { code: "storage", name: "硬盘", shortName: "硬盘", sortOrder: 5 },
  { code: "psu", name: "电源", shortName: "电源", sortOrder: 6 },
  { code: "case", name: "机箱", shortName: "机箱", sortOrder: 7 },
  { code: "cooler", name: "散热器", shortName: "散热", sortOrder: 8 }
];

const updatedAt = "2026-09-08T00:00:00.000Z";

function makePart(
  category: CategoryCode,
  id: string,
  brand: string,
  model: string,
  priceYuan: number,
  displaySpecs: string[],
  specs: PartSpecs
): Part {
  return {
    id,
    category,
    brand,
    model,
    name: `${brand} ${model}`,
    priceFen: priceYuan * 100,
    imageUrl: "",
    status: "active",
    updatedAt,
    displaySpecs,
    specs
  };
}

export const seedParts: Part[] = [
  makePart("cpu", "cpu-7600x", "AMD", "锐龙 5 7600X", 1599, ["6 核 12 线程", "最高 5.3GHz", "AM5"], { kind: "cpu", socket: "AM5", chipsetFamilies: ["B650", "X670", "A620"], tdpW: 105, maxPowerW: 142, generation: "Zen4" }),
  makePart("cpu", "cpu-7700", "AMD", "锐龙 7 7700", 1899, ["8 核 16 线程", "最高 5.3GHz", "AM5"], { kind: "cpu", socket: "AM5", chipsetFamilies: ["B650", "X670", "A620"], tdpW: 65, maxPowerW: 88, generation: "Zen4" }),
  makePart("cpu", "cpu-7800x3d", "AMD", "锐龙 7 7800X3D", 2699, ["8 核 16 线程", "96MB L3", "AM5"], { kind: "cpu", socket: "AM5", chipsetFamilies: ["B650", "X670", "A620"], tdpW: 120, maxPowerW: 162, generation: "Zen4" }),
  makePart("cpu", "cpu-9600x", "AMD", "锐龙 5 9600X", 1799, ["6 核 12 线程", "Zen 5", "AM5"], { kind: "cpu", socket: "AM5", chipsetFamilies: ["B650", "X670", "B850", "X870"], tdpW: 65, maxPowerW: 88, generation: "Zen5" }),
  makePart("cpu", "cpu-14600kf", "Intel", "酷睿 i5-14600KF", 1799, ["14 核 20 线程", "最高 5.3GHz", "LGA1700"], { kind: "cpu", socket: "LGA1700", chipsetFamilies: ["B760", "Z790"], tdpW: 125, maxPowerW: 181, generation: "RaptorLakeRefresh" }),
  makePart("cpu", "cpu-14700f", "Intel", "酷睿 i7-14700F", 2499, ["20 核 28 线程", "最高 5.4GHz", "LGA1700"], { kind: "cpu", socket: "LGA1700", chipsetFamilies: ["B760", "Z790"], tdpW: 65, maxPowerW: 219, generation: "RaptorLakeRefresh" }),
  makePart("cpu", "cpu-14400f", "Intel", "酷睿 i5-14400F", 1299, ["10 核 16 线程", "最高 4.7GHz", "LGA1700"], { kind: "cpu", socket: "LGA1700", chipsetFamilies: ["B760", "Z790"], tdpW: 65, maxPowerW: 148, generation: "RaptorLakeRefresh" }),

  makePart("motherboard", "mb-b650", "华硕", "TUF GAMING B650M-PLUS", 1299, ["AM5", "DDR5", "M-ATX"], { kind: "motherboard", socket: "AM5", chipset: "B650", memoryType: "DDR5", formFactor: "M-ATX", biosReviewGenerations: ["Zen5"], powerW: 45 }),
  makePart("motherboard", "mb-b650-a", "微星", "B650 GAMING PLUS WIFI", 1399, ["AM5", "DDR5", "ATX"], { kind: "motherboard", socket: "AM5", chipset: "B650", memoryType: "DDR5", formFactor: "ATX", biosReviewGenerations: ["Zen5"], powerW: 48 }),
  makePart("motherboard", "mb-x670", "技嘉", "X670 AORUS ELITE AX", 2199, ["AM5", "DDR5", "ATX"], { kind: "motherboard", socket: "AM5", chipset: "X670", memoryType: "DDR5", formFactor: "ATX", biosReviewGenerations: ["Zen5"], powerW: 58 }),
  makePart("motherboard", "mb-a620", "华擎", "A620M Pro RS", 749, ["AM5", "DDR5", "M-ATX"], { kind: "motherboard", socket: "AM5", chipset: "A620", memoryType: "DDR5", formFactor: "M-ATX", biosReviewGenerations: ["Zen5"], powerW: 38 }),
  makePart("motherboard", "mb-b760", "技嘉", "B760M AORUS ELITE AX", 1199, ["LGA1700", "DDR5", "M-ATX"], { kind: "motherboard", socket: "LGA1700", chipset: "B760", memoryType: "DDR5", formFactor: "M-ATX", biosReviewGenerations: ["RaptorLakeRefresh"], powerW: 45 }),
  makePart("motherboard", "mb-b760-d4", "华硕", "TUF GAMING B760M-PLUS D4", 1099, ["LGA1700", "DDR4", "M-ATX"], { kind: "motherboard", socket: "LGA1700", chipset: "B760", memoryType: "DDR4", formFactor: "M-ATX", biosReviewGenerations: ["RaptorLakeRefresh"], powerW: 44 }),
  makePart("motherboard", "mb-z790", "微星", "PRO Z790-A MAX WIFI", 1899, ["LGA1700", "DDR5", "ATX"], { kind: "motherboard", socket: "LGA1700", chipset: "Z790", memoryType: "DDR5", formFactor: "ATX", biosReviewGenerations: [], powerW: 58 }),

  makePart("gpu", "gpu-4060", "华硕", "DUAL RTX 4060 O8G", 2299, ["8GB GDDR6", "227mm", "115W"], { kind: "gpu", lengthMm: 227, powerW: 115 }),
  makePart("gpu", "gpu-4060ti", "微星", "RTX 4060 Ti GAMING X 8G", 2699, ["8GB GDDR6", "247mm", "160W"], { kind: "gpu", lengthMm: 247, powerW: 160 }),
  makePart("gpu", "gpu-4070s", "七彩虹", "RTX 4070 SUPER Ultra W", 4599, ["12GB GDDR6X", "310mm", "220W"], { kind: "gpu", lengthMm: 310, powerW: 220 }),
  makePart("gpu", "gpu-4080s", "索泰", "RTX 4080 SUPER Trinity", 8099, ["16GB GDDR6X", "356mm", "320W"], { kind: "gpu", lengthMm: 356, powerW: 320 }),
  makePart("gpu", "gpu-7700xt", "蓝宝石", "RX 7700 XT 白金版", 3199, ["12GB GDDR6", "280mm", "245W"], { kind: "gpu", lengthMm: 280, powerW: 245 }),
  makePart("gpu", "gpu-7800xt", "蓝宝石", "RX 7800 XT 白金版", 3899, ["16GB GDDR6", "320mm", "263W"], { kind: "gpu", lengthMm: 320, powerW: 263 }),
  makePart("gpu", "gpu-a770", "英特尔", "Arc A770 16GB", 2199, ["16GB GDDR6", "267mm", "225W"], { kind: "gpu", lengthMm: 267, powerW: 225 }),

  makePart("memory", "ram-fury", "金士顿", "FURY DDR5 6000 32GB", 699, ["16GB×2", "6000MT/s", "CL36"], { kind: "memory", memoryType: "DDR5", capacityMb: 32768, moduleCount: 2, powerW: 12 }),
  makePart("memory", "ram-z5", "芝奇", "焰锋戟 DDR5 6000 32GB", 799, ["16GB×2", "6000MT/s", "CL30"], { kind: "memory", memoryType: "DDR5", capacityMb: 32768, moduleCount: 2, powerW: 12 }),
  makePart("memory", "ram-vengeance", "海盗船", "VENGEANCE DDR5 6400 32GB", 829, ["16GB×2", "6400MT/s", "CL36"], { kind: "memory", memoryType: "DDR5", capacityMb: 32768, moduleCount: 2, powerW: 13 }),
  makePart("memory", "ram-kingbank", "金百达", "银爵 DDR5 6000 32GB", 599, ["16GB×2", "6000MT/s", "CL30"], { kind: "memory", memoryType: "DDR5", capacityMb: 32768, moduleCount: 2, powerW: 12 }),
  makePart("memory", "ram-ddr4", "光威", "天策 DDR4 3600 32GB", 459, ["16GB×2", "3600MT/s", "CL18"], { kind: "memory", memoryType: "DDR4", capacityMb: 32768, moduleCount: 2, powerW: 10 }),
  makePart("memory", "ram-fury-d4", "金士顿", "FURY DDR4 3200 32GB", 499, ["16GB×2", "3200MT/s", "CL16"], { kind: "memory", memoryType: "DDR4", capacityMb: 32768, moduleCount: 2, powerW: 10 }),
  makePart("memory", "ram-z5-64", "芝奇", "焰锋戟 DDR5 6000 64GB", 1399, ["32GB×2", "6000MT/s", "CL32"], { kind: "memory", memoryType: "DDR5", capacityMb: 65536, moduleCount: 2, powerW: 16 }),

  makePart("storage", "ssd-tiplus", "致态", "TiPlus7100 1TB", 799, ["PCIe 4.0", "7000MB/s", "1TB"], { kind: "storage", interface: "PCIe 4.0 x4", capacityGb: 1024, powerW: 7 }),
  makePart("storage", "ssd-sn850x", "西部数据", "SN850X 1TB", 729, ["PCIe 4.0", "7300MB/s", "1TB"], { kind: "storage", interface: "PCIe 4.0 x4", capacityGb: 1024, powerW: 8 }),
  makePart("storage", "ssd-p44", "SOLIDIGM", "P44 Pro 2TB", 1099, ["PCIe 4.0", "7000MB/s", "2TB"], { kind: "storage", interface: "PCIe 4.0 x4", capacityGb: 2048, powerW: 8 }),
  makePart("storage", "ssd-990pro", "三星", "990 PRO 2TB", 1299, ["PCIe 4.0", "7450MB/s", "2TB"], { kind: "storage", interface: "PCIe 4.0 x4", capacityGb: 2048, powerW: 9 }),
  makePart("storage", "ssd-p3", "英睿达", "P3 Plus 1TB", 529, ["PCIe 4.0", "5000MB/s", "1TB"], { kind: "storage", interface: "PCIe 4.0 x4", capacityGb: 1024, powerW: 6 }),
  makePart("storage", "ssd-rc20", "铠侠", "RC20 1TB", 499, ["PCIe 3.0", "2100MB/s", "1TB"], { kind: "storage", interface: "PCIe 3.0 x4", capacityGb: 1024, powerW: 6 }),
  makePart("storage", "ssd-mx500", "英睿达", "MX500 2TB", 899, ["SATA", "560MB/s", "2TB"], { kind: "storage", interface: "SATA 6Gb/s", capacityGb: 2048, powerW: 5 }),

  makePart("psu", "psu-k650", "航嘉", "MVP K650 650W", 399, ["650W", "金牌", "全模组"], { kind: "psu", ratedPowerW: 650, efficiency: "80 PLUS 金牌", modular: "全模组" }),
  makePart("psu", "psu-k750", "航嘉", "MVP K750 750W", 499, ["750W", "金牌", "全模组"], { kind: "psu", ratedPowerW: 750, efficiency: "80 PLUS 金牌", modular: "全模组" }),
  makePart("psu", "psu-g7", "长城", "G7 750W", 459, ["750W", "金牌", "全模组"], { kind: "psu", ratedPowerW: 750, efficiency: "80 PLUS 金牌", modular: "全模组" }),
  makePart("psu", "psu-gx3", "酷冷至尊", "GX III 850W", 699, ["850W", "金牌", "全模组"], { kind: "psu", ratedPowerW: 850, efficiency: "80 PLUS 金牌", modular: "全模组" }),
  makePart("psu", "psu-rm850e", "海盗船", "RM850e 850W", 799, ["850W", "金牌", "全模组"], { kind: "psu", ratedPowerW: 850, efficiency: "80 PLUS 金牌", modular: "全模组" }),
  makePart("psu", "psu-focus1000", "海韵", "FOCUS GX1000", 1099, ["1000W", "金牌", "全模组"], { kind: "psu", ratedPowerW: 1000, efficiency: "80 PLUS 金牌", modular: "全模组" }),
  makePart("psu", "psu-v550", "酷冷至尊", "V550 SFX GOLD", 599, ["550W", "金牌", "全模组"], { kind: "psu", ratedPowerW: 550, efficiency: "80 PLUS 金牌", modular: "全模组" }),

  makePart("case", "case-air100", "乔思伯", "D31 MESH", 399, ["M-ATX", "显卡限长 330mm", "散热限高 168mm"], { kind: "case", supportedFormFactors: ["M-ATX", "ITX"], maxGpuLengthMm: 330, maxCoolerHeightMm: 168 }),
  makePart("case", "case-lancool", "联力", "LANCOOL 216", 699, ["ATX", "显卡限长 392mm", "散热限高 180mm"], { kind: "case", supportedFormFactors: ["ATX", "M-ATX", "ITX"], maxGpuLengthMm: 392, maxCoolerHeightMm: 180 }),
  makePart("case", "case-nr200", "酷冷至尊", "NR200P", 599, ["ITX", "显卡限长 330mm", "散热限高 155mm"], { kind: "case", supportedFormFactors: ["ITX"], maxGpuLengthMm: 330, maxCoolerHeightMm: 155 }),
  makePart("case", "case-ap201", "华硕", "Prime AP201", 499, ["M-ATX", "显卡限长 338mm", "散热限高 170mm"], { kind: "case", supportedFormFactors: ["M-ATX", "ITX"], maxGpuLengthMm: 338, maxCoolerHeightMm: 170 }),
  makePart("case", "case-y40", "HYTE", "Y40", 999, ["ATX", "显卡限长 422mm", "散热限高 183mm"], { kind: "case", supportedFormFactors: ["ATX", "M-ATX", "ITX"], maxGpuLengthMm: 422, maxCoolerHeightMm: 183 }),
  makePart("case", "case-a4h2o", "联力", "A4-H2O", 899, ["ITX", "显卡限长 322mm", "散热限高 55mm"], { kind: "case", supportedFormFactors: ["ITX"], maxGpuLengthMm: 322, maxCoolerHeightMm: 55 }),
  makePart("case", "case-c3", "酷冷至尊", "TD300 Mesh", 449, ["M-ATX", "显卡限长 344mm", "散热限高 166mm"], { kind: "case", supportedFormFactors: ["M-ATX", "ITX"], maxGpuLengthMm: 344, maxCoolerHeightMm: 166 }),

  makePart("cooler", "cooler-pa120", "利民", "Peerless Assassin 120", 229, ["双塔双风扇", "157mm", "AM5 / LGA1700"], { kind: "cooler", heightMm: 157, supportedSockets: ["AM5", "LGA1700"], powerW: 6 }),
  makePart("cooler", "cooler-ak620", "九州风神", "AK620", 359, ["双塔双风扇", "160mm", "AM5 / LGA1700"], { kind: "cooler", heightMm: 160, supportedSockets: ["AM5", "LGA1700"], powerW: 6 }),
  makePart("cooler", "cooler-l9i", "猫头鹰", "NH-L9i-17xx", 399, ["下压式", "37mm", "仅 LGA1700"], { kind: "cooler", heightMm: 37, supportedSockets: ["LGA1700"], powerW: 3 }),
  makePart("cooler", "cooler-l9a", "猫头鹰", "NH-L9a-AM5", 399, ["下压式", "37mm", "仅 AM5"], { kind: "cooler", heightMm: 37, supportedSockets: ["AM5"], powerW: 3 }),
  makePart("cooler", "cooler-u12s", "猫头鹰", "NH-U12S redux", 429, ["单塔单风扇", "158mm", "AM5 / LGA1700"], { kind: "cooler", heightMm: 158, supportedSockets: ["AM5", "LGA1700"], powerW: 4 }),
  makePart("cooler", "cooler-assassin4", "九州风神", "ASSASSIN IV", 649, ["双塔", "164mm", "AM5 / LGA1700"], { kind: "cooler", heightMm: 164, supportedSockets: ["AM5", "LGA1700"], powerW: 7 }),
  makePart("cooler", "cooler-axp90", "利民", "AXP90-X47", 169, ["下压式", "47mm", "AM5 / LGA1700"], { kind: "cooler", heightMm: 47, supportedSockets: ["AM5", "LGA1700"], powerW: 3 })
];

export const demoSelection: Partial<Record<CategoryCode, string>> = {
  cpu: "cpu-7600x",
  motherboard: "mb-b650",
  gpu: "gpu-4060ti",
  memory: "ram-fury",
  storage: "ssd-tiplus",
  psu: "psu-g7"
};

export function getPartsByIds(ids: Partial<Record<CategoryCode, string>>, catalog: Part[] = seedParts): Part[] {
  const byId = new Map(catalog.map((part) => [part.id, part]));
  return categories.flatMap((category) => {
    const id = ids[category.code];
    const found = id ? byId.get(id) : undefined;
    return found ? [found] : [];
  });
}
