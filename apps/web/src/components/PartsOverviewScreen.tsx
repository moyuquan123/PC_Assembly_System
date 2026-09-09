import { Box, ChevronRight, CircuitBoard, Clock3, Cpu, Fan, HardDrive, MemoryStick, RefreshCw, Search, Server, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { categories } from "@pc-assembly/domain";
import type { CategoryCode, Part } from "@pc-assembly/domain";
import PartDetailModal from "./PartDetailModal";
import { formatYuan } from "../lib/format";
import { getCatalogFreshness } from "../lib/api";

const categoryIcons: Record<CategoryCode, LucideIcon> = {
  cpu: Cpu,
  motherboard: CircuitBoard,
  gpu: Server,
  memory: MemoryStick,
  storage: HardDrive,
  psu: Zap,
  case: Box,
  cooler: Fan
};

export default function PartsOverviewScreen({ parts, loading, error, onStart }: {
  parts: Part[];
  loading: boolean;
  error: string;
  onStart: () => void;
}) {
  const [category, setCategory] = useState<CategoryCode>("cpu");
  const [brand, setBrand] = useState("全部");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"price-asc" | "price-desc" | "name">("price-asc");
  const [detail, setDetail] = useState<Part | null>(null);
  const freshness = useQuery({ queryKey: ["catalog-freshness"], queryFn: getCatalogFreshness, refetchInterval: 60_000 });
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("zh-CN"));
  const activeCategory = categories.find((item) => item.code === category)!;
  const categoryParts = useMemo(() => parts.filter((part) => part.category === category), [category, parts]);
  const brands = useMemo(() => [...new Set(categoryParts.map((part) => part.brand))].toSorted((left, right) => left.localeCompare(right, "zh-CN")), [categoryParts]);
  const visibleParts = useMemo(() => categoryParts.filter((part) => {
    if (brand !== "全部" && part.brand !== brand) return false;
    return !deferredQuery || `${part.brand} ${part.model}`.toLocaleLowerCase("zh-CN").includes(deferredQuery);
  }).toSorted((left, right) => sort === "price-asc" ? left.priceFen - right.priceFen : sort === "price-desc" ? right.priceFen - left.priceFen : left.name.localeCompare(right.name, "zh-CN")), [brand, categoryParts, deferredQuery, sort]);

  const selectCategory = (next: CategoryCode) => {
    setCategory(next);
    setBrand("全部");
    setQuery("");
  };

  if (loading) return <main className="parts-overview-screen"><section className="page-state"><p>正在整理配件目录…</p></section></main>;
  if (error) return <main className="parts-overview-screen"><section className="page-state error-state"><h1>配件目录加载失败</h1><p>{error}</p><button type="button" onClick={() => window.location.reload()}>重新加载</button></section></main>;

  return <main className="parts-overview-screen">
    <header className="parts-overview-heading">
      <div><h1>配置总览</h1><p>按配件类别与品牌，浏览当前收录的市售硬件。</p><CatalogFreshnessStatus freshness={freshness.data} /></div>
      <button className="primary-button parts-start-button" type="button" onClick={onStart}>去开始装机 <ChevronRight size={18} /></button>
    </header>
    <div className="parts-overview-layout">
      <nav className="parts-category-rail" aria-label="配件类别">
        {categories.map((item) => {
          const Icon = categoryIcons[item.code];
          const count = parts.filter((part) => part.category === item.code).length;
          return <button key={item.code} type="button" className={category === item.code ? "active" : ""} aria-current={category === item.code ? "page" : undefined} onClick={() => selectCategory(item.code)}>
            <Icon size={25} strokeWidth={1.8} /><span><strong>{item.name}</strong><small>{count} 款</small></span><ChevronRight size={18} />
          </button>;
        })}
      </nav>
      <section className="parts-results" aria-labelledby="parts-results-title">
        <h2 id="parts-results-title">{activeCategory.name}</h2>
        <div className="parts-toolbar">
          <label className="parts-search"><Search size={19} /><span className="sr-only">搜索品牌或型号</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索品牌或型号" /></label>
          <div className="parts-brand-filters" role="group" aria-label="品牌筛选">
            {["全部", ...brands].map((option) => <button key={option} type="button" className={brand === option ? "active" : ""} aria-pressed={brand === option} onClick={() => setBrand(option)}>{option}</button>)}
          </div>
          <label className="parts-sort"><span className="sr-only">排序方式</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="price-asc">价格从低到高</option><option value="price-desc">价格从高到低</option><option value="name">按名称排序</option></select></label>
        </div>
        <div className="parts-count-row"><h3>共 {visibleParts.length} 款{activeCategory.shortName}</h3>{brand !== "全部" || query ? <button type="button" onClick={() => { setBrand("全部"); setQuery(""); }}>清除筛选</button> : null}</div>
        {visibleParts.length ? <div className="parts-table-wrap"><table className="parts-table">
          <thead><tr><th>产品</th><th>品牌 / 型号</th><th>关键规格</th><th>参考价格</th><th>收录状态</th><th>操作</th></tr></thead>
          <tbody>{visibleParts.map((part) => <PartOverviewRow key={part.id} part={part} Icon={categoryIcons[part.category]} onOpen={setDetail} />)}</tbody>
        </table></div> : <div className="configuration-empty"><Search size={28} /><h3>没有匹配的配件</h3><p>试试切换品牌或更换搜索关键词。</p></div>}
        <p className="parts-price-note">已接入的数据会按计划自动刷新；价格仍以跳转后的电商平台页面为准。</p>
      </section>
    </div>
    <PartDetailModal part={detail} onClose={() => setDetail(null)} />
  </main>;
}

function CatalogFreshnessStatus({ freshness }: { freshness: Awaited<ReturnType<typeof getCatalogFreshness>> | undefined }) {
  if (!freshness) return <span className="catalog-freshness"><Clock3 size={15} />正在读取数据更新时间…</span>;
  const live = freshness.mode === "live";
  const time = freshness.lastSuccessfulAt ? formatFreshnessTime(freshness.lastSuccessfulAt) : "尚未同步";
  return <span className={`catalog-freshness ${freshness.status}`} title={freshness.message}>{live ? <RefreshCw size={15} /> : <Clock3 size={15} />}<strong>{live ? freshness.sourceName : "本地目录"}</strong><i>·</i>{live ? `${time}更新` : "配置授权数据源后自动更新"}</span>;
}

function formatFreshnessTime(value: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`;
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(value));
}

function PartOverviewRow({ part, Icon, onOpen }: { part: Part; Icon: LucideIcon; onOpen: (part: Part) => void }) {
  return <tr>
    <td data-label="产品"><span className="part-product-mark">{part.imageUrl ? <img src={part.imageUrl} alt="" /> : <Icon size={25} strokeWidth={1.55} />}</span></td>
    <td data-label="品牌 / 型号"><small>{part.brand}</small><strong>{part.model}</strong></td>
    <td data-label="关键规格"><div className="part-spec-list">{part.displaySpecs.slice(0, 3).map((spec) => <span key={spec}>{spec}</span>)}</div></td>
    <td data-label="参考价格"><strong className="configuration-price">{formatYuan(part.priceFen)}</strong></td>
    <td data-label="收录状态"><span className="part-active-status">当前在售</span></td>
    <td data-label="操作"><button className="part-detail-button" type="button" onClick={() => onOpen(part)}>查看详情</button></td>
  </tr>;
}
