import { CheckCircle2, Search, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Part } from "@pc-assembly/domain";
import ConfigurationLibraryModal from "./ConfigurationLibraryModal";
import { configurationClasses, createConfigurationLibrary } from "../lib/configuration-library";
import type { ConfigurationClass, MarketConfiguration, PlatformBrand } from "../lib/configuration-library";
import { formatYuan } from "../lib/format";

type BrandFilter = "全部" | PlatformBrand;
type ClassFilter = "全部" | ConfigurationClass;

export default function ConfigurationLibraryScreen({ parts, loading, error, onApply }: {
  parts: Part[];
  loading: boolean;
  error: string;
  onApply: (configuration: MarketConfiguration) => void;
}) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<BrandFilter>("全部");
  const [configurationClass, setConfigurationClass] = useState<ClassFilter>("全部");
  const [detail, setDetail] = useState<MarketConfiguration | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("zh-CN"));
  const configurations = useMemo(() => createConfigurationLibrary(parts), [parts]);
  const visibleConfigurations = useMemo(() => configurations.filter((configuration) => {
    if (brand !== "全部" && configuration.platform !== brand) return false;
    if (configurationClass !== "全部" && configuration.configurationClass !== configurationClass) return false;
    if (!deferredQuery) return true;
    const cpu = configuration.summary.parts.find((part) => part.category === "cpu")!;
    const gpu = configuration.summary.parts.find((part) => part.category === "gpu")!;
    return `${configuration.name} ${cpu.name} ${gpu.name}`.toLocaleLowerCase("zh-CN").includes(deferredQuery);
  }), [brand, configurationClass, configurations, deferredQuery]);

  if (loading) return <main className="configuration-library-screen"><section className="page-state"><p>正在整理配置方案…</p></section></main>;
  if (error) return <main className="configuration-library-screen"><section className="page-state error-state"><h1>配置库加载失败</h1><p>{error}</p><button type="button" onClick={() => window.location.reload()}>重新加载</button></section></main>;

  return <main className="configuration-library-screen">
    <header className="configuration-library-heading"><h1>配置总览</h1><p>按品牌平台与使用场景，浏览当前收录的完整装机方案。</p><small>首版展示当前配件库可验证方案，价格为参考价。</small></header>
    <section className="configuration-filters" aria-label="配置筛选">
      <label className="configuration-search"><Search size={19} /><span className="sr-only">搜索配置</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索配置名称、CPU 或显卡" /></label>
      <FilterGroup label="品牌平台" options={["全部", "AMD", "Intel"]} selected={brand} onSelect={(value) => setBrand(value as BrandFilter)} />
      <FilterGroup label="配置分类" options={["全部", ...configurationClasses]} selected={configurationClass} onSelect={(value) => setConfigurationClass(value as ClassFilter)} />
    </section>
    <section className="configuration-results" aria-labelledby="configuration-results-title">
      <div className="configuration-results-heading"><h2 id="configuration-results-title">共 {visibleConfigurations.length} 套方案</h2>{brand !== "全部" || configurationClass !== "全部" || query ? <button type="button" onClick={() => { setQuery(""); setBrand("全部"); setConfigurationClass("全部"); }}>清除筛选</button> : null}</div>
      {visibleConfigurations.length > 0 ? <div className="configuration-table-wrap"><table className="configuration-table">
        <thead><tr><th>配置名称</th><th>品牌平台</th><th>配置分类</th><th>CPU</th><th>显卡</th><th>参考总价</th><th>预计功耗</th><th>兼容性状态</th><th>操作</th></tr></thead>
        <tbody>{visibleConfigurations.map((configuration) => <ConfigurationRow key={configuration.id} configuration={configuration} onOpen={setDetail} onApply={onApply} />)}</tbody>
      </table></div> : <div className="configuration-empty"><SlidersHorizontal size={28} /><h3>没有匹配的配置</h3><p>试试清除筛选或更换搜索关键词。</p></div>}
    </section>
    <ConfigurationLibraryModal configuration={detail} onClose={() => setDetail(null)} onApply={onApply} />
  </main>;
}

function FilterGroup({ label, options, selected, onSelect }: { label: string; options: readonly string[]; selected: string; onSelect: (value: string) => void }) {
  return <fieldset className="configuration-filter-group"><legend>{label}</legend><div>{options.map((option) => <button type="button" key={option} className={selected === option ? "active" : ""} aria-pressed={selected === option} onClick={() => onSelect(option)}>{option}</button>)}</div></fieldset>;
}

function ConfigurationRow({ configuration, onOpen, onApply }: { configuration: MarketConfiguration; onOpen: (configuration: MarketConfiguration) => void; onApply: (configuration: MarketConfiguration) => void }) {
  const cpu = configuration.summary.parts.find((part) => part.category === "cpu")!;
  const gpu = configuration.summary.parts.find((part) => part.category === "gpu")!;
  const hasWarning = configuration.checks.some((check) => check.level === "warning");
  return <tr>
    <td data-label="配置名称"><strong className="configuration-name">{configuration.name}</strong></td>
    <td data-label="品牌平台"><span className={`platform-brand ${configuration.platform.toLocaleLowerCase()}`}><i>{configuration.platform === "AMD" ? "A" : "I"}</i>{configuration.platform}</span></td>
    <td data-label="配置分类">{configuration.configurationClass}</td>
    <td data-label="CPU">{cpu.name}</td><td data-label="显卡">{gpu.name}</td>
    <td data-label="参考总价"><strong className="configuration-price">{formatYuan(configuration.summary.totalFen)}</strong></td>
    <td data-label="预计功耗">{configuration.summary.estimatedPowerW}W</td>
    <td data-label="兼容性状态"><span className={`configuration-status ${hasWarning ? "warning" : "success"}`}>{hasWarning ? <TriangleAlert size={17} /> : <CheckCircle2 size={17} />}{hasWarning ? "需要确认" : "兼容性良好"}</span></td>
    <td data-label="操作"><div className="configuration-actions"><button type="button" onClick={() => onOpen(configuration)}>查看配置</button><button className="primary" type="button" onClick={() => onApply(configuration)}>采用配置</button></div></td>
  </tr>;
}
