export function formatYuan(priceFen: number): string {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(priceFen / 100);
}
