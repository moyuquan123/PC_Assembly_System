import { Check, Search, TriangleAlert } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { checkCandidate } from "@pc-assembly/domain";
import type { BuildSnapshot, Category, Part } from "@pc-assembly/domain";
import { formatYuan } from "../lib/format";

function PartVisual({ part }: { part: Part }) {
  const labels: Record<Part["category"], string> = { cpu: "CPU", motherboard: "MB", gpu: "GPU", memory: "RAM", storage: "SSD", psu: "PSU", case: "CASE", cooler: "COOL" };
  if (part.imageUrl) return <img className="part-image" src={part.imageUrl} alt="" />;
  return <div className={`part-visual part-visual-${part.category}`} aria-hidden="true"><span>{labels[part.category]}</span><i /><i /><i /></div>;
}

function filterOptions(category: Category["code"]): Array<{ id: string; label: string }> {
  if (category === "psu") return [{ id: "all", label: "全部" }, { id: "650", label: "650W" }, { id: "750", label: "750W" }, { id: "850", label: "850W+" }];
  return [{ id: "all", label: "全部" }, { id: "budget", label: "入门" }, { id: "mid", label: "主流" }, { id: "high", label: "高端" }];
}

export default function ProductCatalog({ category, products, selectedId, snapshot, onChoose, onOpenDetail }: {
  category: Category;
  products: Part[];
  selectedId: string | undefined;
  snapshot: BuildSnapshot;
  onChoose: (productId: string) => void;
  onOpenDetail: (part: Part) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("zh-CN"));
  const options = filterOptions(category.code);
  const prices = useMemo(() => products.map((part) => part.priceFen).toSorted((a, b) => a - b), [products]);
  const lowThreshold = prices[Math.max(0, Math.floor(prices.length / 3) - 1)] ?? 0;
  const highThreshold = prices[Math.floor((prices.length * 2) / 3)] ?? Number.MAX_SAFE_INTEGER;
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesText = !deferredQuery || `${product.brand} ${product.model} ${product.name}`.toLocaleLowerCase("zh-CN").includes(deferredQuery);
    if (!matchesText || filter === "all") return matchesText;
    if (category.code === "psu" && product.specs.kind === "psu") {
      if (filter === "650") return product.specs.ratedPowerW <= 650;
      if (filter === "750") return product.specs.ratedPowerW === 750;
      return product.specs.ratedPowerW >= 850;
    }
    if (filter === "budget") return product.priceFen <= lowThreshold;
    if (filter === "mid") return product.priceFen > lowThreshold && product.priceFen < highThreshold;
    return product.priceFen >= highThreshold;
  }), [category.code, deferredQuery, filter, highThreshold, lowThreshold, products]);

  return <section className="catalog" aria-labelledby="catalog-title">
    <div className="catalog-heading"><div><h1 id="catalog-title">选择{category.shortName}</h1><p>不兼容项仍会显示，但不能加入当前配置。</p></div><span className="result-count">{visibleProducts.length} 个可选型号</span></div>
    <div className="catalog-toolbar"><label className="search-box"><Search size={18} /><span className="sr-only">搜索品牌或型号</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索品牌或型号" /></label>
      <div className="filter-tabs" role="group" aria-label="配件筛选">{options.map((option) => <button key={option.id} type="button" className={filter === option.id ? "active" : ""} onClick={() => setFilter(option.id)}>{option.label}</button>)}</div>
    </div>
    <div className="product-list">{visibleProducts.map((product) => {
      const isSelected = selectedId === product.id;
      const checks = checkCandidate(snapshot, product);
      const issue = checks.find((item) => item.level === "incompatible") ?? checks.find((item) => item.level === "warning");
      const isError = issue?.level === "incompatible";
      return <article className={`product-row${isSelected ? " selected" : ""}${isError ? " incompatible" : ""}`} key={product.id}>
        <button className="part-visual-button" type="button" onClick={() => onOpenDetail(product)} aria-label={`查看 ${product.name} 详情`}><PartVisual part={product} /></button>
        <div className="product-info"><button className="product-name-button" type="button" onClick={() => onOpenDetail(product)}><h2>{product.name}</h2></button>
          <div className="spec-list">{product.displaySpecs.map((spec) => <span key={spec}>{spec}</span>)}</div>
          <div className={`row-compatibility ${issue?.level ?? "compatible"}`}>{issue ? <TriangleAlert size={16} /> : <Check size={16} />}<span>{issue?.message ?? "与当前配置兼容"}</span></div>
        </div>
        <div className="product-action"><strong>{formatYuan(product.priceFen)}</strong><button className={isSelected ? "select-button selected" : "select-button"} type="button" disabled={isError} onClick={() => onChoose(product.id)}>{isSelected ? <><Check size={17} /> 已选择</> : isError ? "不兼容" : "选择"}</button></div>
      </article>;
    })}{visibleProducts.length === 0 ? <div className="empty-products">没有找到匹配的配件，请调整筛选条件。</div> : null}</div>
    <p className="catalog-note">价格为参考价，实际以购买渠道为准。兼容性结果用于辅助决策，最终请核对厂商支持列表。</p>
  </section>;
}
