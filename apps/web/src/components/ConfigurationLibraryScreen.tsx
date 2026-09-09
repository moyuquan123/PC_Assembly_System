import { CheckCircle2, Info, PcCase, Search, SlidersHorizontal, Upload } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { BuildDraft, CategoryCode, Part } from "@pc-assembly/domain";
import ConfigurationLibraryModal from "./ConfigurationLibraryModal";
import UploadConfigurationModal from "./UploadConfigurationModal";
import type { ConfigurationSubmissionFields } from "./UploadConfigurationModal";
import { getConfigurationEngagement, getPublishedConfigurations, recordConfigurationClick, recordConfigurationImpressions } from "../lib/api";
import type { ConfigurationEngagement, PublicUser } from "../lib/api";
import { configurationClasses, createConfigurationLibrary } from "../lib/configuration-library";
import type { ConfigurationClass, MarketConfiguration } from "../lib/configuration-library";
import { formatYuan } from "../lib/format";

type ClassFilter = "全部" | ConfigurationClass;
type SourceFilter = "全部方案" | "官方方案" | "用户投稿";
type SortMode = "hybrid" | "recommend" | "comments" | "ctr" | "newest";

export default function ConfigurationLibraryScreen({ parts, draft, user, loading, error, onApply, onStart, onPublish, onRequireAccount }: {
  parts: Part[];
  draft: BuildDraft;
  user: PublicUser | undefined;
  loading: boolean;
  error: string;
  onApply: (configuration: MarketConfiguration) => void;
  onStart: () => void;
  onPublish: (fields: ConfigurationSubmissionFields) => Promise<void>;
  onRequireAccount: () => void;
}) {
  const queryClient = useQueryClient();
  const communityQuery = useQuery({ queryKey: ["published-configurations"], queryFn: getPublishedConfigurations, retry: false });
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("全部方案");
  const [configurationClass, setConfigurationClass] = useState<ClassFilter>("全部");
  const [sortMode, setSortMode] = useState<SortMode>("hybrid");
  const [detail, setDetail] = useState<MarketConfiguration | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const impressedKeys = useRef(new Set<string>());
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("zh-CN"));
  const officialConfigurations = useMemo(() => createConfigurationLibrary(parts), [parts]);
  const communityConfigurations = useMemo<MarketConfiguration[]>(() => (communityQuery.data ?? []).map((configuration) => {
    const cpu = configuration.parts.find((part) => part.category === "cpu");
    return {
      ...configuration,
      engagementKey: `community:${configuration.id}`,
      selectedPartIds: configuration.selectedPartIds as Partial<Record<CategoryCode, string>>,
      platform: cpu?.brand === "Intel" || cpu?.brand === "英特尔" ? "Intel" : "AMD",
      source: "community" as const,
      referenceBudgetFen: Math.ceil(configuration.summary.totalFen / 50_000) * 50_000
    };
  }), [communityQuery.data]);
  const configurations = useMemo(() => [...communityConfigurations, ...officialConfigurations], [communityConfigurations, officialConfigurations]);
  const engagementKeys = useMemo(() => configurations.map((item) => item.engagementKey), [configurations]);
  const engagementQuery = useQuery({
    queryKey: ["configuration-engagement", engagementKeys.join("|")],
    queryFn: () => getConfigurationEngagement(engagementKeys),
    enabled: engagementKeys.length > 0,
    retry: false
  });
  const engagementMap = useMemo(() => new Map((engagementQuery.data ?? []).map((item) => [item.configurationKey, item])), [engagementQuery.data]);
  const visibleConfigurations = useMemo(() => {
    const filtered = configurations.filter((configuration) => {
      if (source === "官方方案" && configuration.source !== "official") return false;
      if (source === "用户投稿" && configuration.source !== "community") return false;
      if (configurationClass !== "全部" && configuration.configurationClass !== configurationClass) return false;
      if (!deferredQuery) return true;
      const cpu = configuration.summary.parts.find((part) => part.category === "cpu");
      const gpu = configuration.summary.parts.find((part) => part.category === "gpu");
      return `${configuration.name} ${configuration.authorName} ${cpu?.name ?? ""} ${gpu?.name ?? ""}`.toLocaleLowerCase("zh-CN").includes(deferredQuery);
    });
    return filtered.toSorted((left, right) => compareConfigurations(left, right, sortMode, engagementMap));
  }, [configurationClass, configurations, deferredQuery, engagementMap, sortMode, source]);

  useEffect(() => {
    const freshKeys = visibleConfigurations.map((item) => item.engagementKey).filter((key) => !impressedKeys.current.has(key));
    if (freshKeys.length === 0) return;
    freshKeys.forEach((key) => impressedKeys.current.add(key));
    void recordConfigurationImpressions(freshKeys).then(() => queryClient.invalidateQueries({ queryKey: ["configuration-engagement"] })).catch(() => undefined);
  }, [queryClient, visibleConfigurations]);

  const submit = async (fields: ConfigurationSubmissionFields) => {
    await onPublish(fields);
    await queryClient.invalidateQueries({ queryKey: ["published-configurations"] });
    setUploadOpen(false);
  };
  const openDetail = (configuration: MarketConfiguration) => {
    setDetail(configuration);
    void recordConfigurationClick(configuration.engagementKey).then(() => queryClient.invalidateQueries({ queryKey: ["configuration-engagement"] })).catch(() => undefined);
  };
  const refreshEngagement = () => queryClient.invalidateQueries({ queryKey: ["configuration-engagement"] });

  if (loading) return <main className="configuration-library-screen"><section className="page-state"><p>正在整理配置方案…</p></section></main>;
  if (error) return <main className="configuration-library-screen"><section className="page-state error-state"><h1>配置方案加载失败</h1><p>{error}</p><button type="button" onClick={() => window.location.reload()}>重新加载</button></section></main>;

  return <main className="configuration-library-screen">
    <header className="configuration-library-heading configuration-plan-heading"><div><h1>配置方案</h1><p>浏览完整装机方案，也可以分享你自己的配置。</p></div><div><button className="primary-button" type="button" onClick={() => user ? setUploadOpen(true) : onRequireAccount()}><Upload size={18} />上传我的配置</button><button className="secondary-button" type="button" onClick={onStart}>开始装机</button></div></header>
    <section className="configuration-filters plan-filters" aria-label="配置筛选">
      <label className="configuration-search"><Search size={19} /><span className="sr-only">搜索配置</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索配置名称、作者、CPU 或显卡" /></label>
      <FilterGroup label="方案来源" options={["全部方案", "官方方案", "用户投稿"]} selected={source} onSelect={(value) => setSource(value as SourceFilter)} />
      <FilterGroup label="配置分类" options={["全部", ...configurationClasses]} selected={configurationClass} onSelect={(value) => setConfigurationClass(value as ClassFilter)} />
    </section>
    <section className="configuration-results" aria-labelledby="configuration-results-title">
      <div className="configuration-results-heading plan-results-heading"><h2 id="configuration-results-title">共 {visibleConfigurations.length} 套方案</h2><div className="ranking-controls"><label><span className="sr-only">排序方式</span><select aria-label="排序方式" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="hybrid">综合排序</option><option value="recommend">推荐最多</option><option value="comments">评论最多</option><option value="ctr">点击率最高</option><option value="newest">最新发布</option></select></label><span><Info size={15} />综合分根据推荐、评论与点击率计算</span></div>{source !== "全部方案" || configurationClass !== "全部" || query ? <button type="button" onClick={() => { setQuery(""); setSource("全部方案"); setConfigurationClass("全部"); }}>清除筛选</button> : null}</div>
      {communityQuery.error ? <p className="community-load-note">用户投稿暂时无法加载，官方方案仍可正常浏览。</p> : null}
      {visibleConfigurations.length > 0 ? <div className="configuration-table-wrap"><table className="configuration-table plan-table community-plan-table">
        <thead><tr><th>配置名称</th><th>来源</th><th>配置分类</th><th>参考总价</th><th>互动数据</th><th>综合分</th><th>操作</th></tr></thead>
        <tbody>{visibleConfigurations.map((configuration) => <ConfigurationRow key={configuration.engagementKey} configuration={configuration} engagement={engagementMap.get(configuration.engagementKey)} onOpen={openDetail} onApply={onApply} />)}</tbody>
      </table></div> : <div className="configuration-empty"><SlidersHorizontal size={28} /><h3>没有匹配的配置</h3><p>试试清除筛选或更换搜索关键词。</p></div>}
    </section>
    <ConfigurationLibraryModal configuration={detail} engagement={detail ? engagementMap.get(detail.engagementKey) : undefined} user={user} onRequireAccount={onRequireAccount} onEngagementChange={refreshEngagement} onClose={() => setDetail(null)} onApply={onApply} />
    <UploadConfigurationModal open={uploadOpen} draft={draft} parts={parts} authorName={user?.displayName ?? ""} onClose={() => setUploadOpen(false)} onGoToBuilder={() => { setUploadOpen(false); onStart(); }} onSubmit={submit} />
  </main>;
}

function FilterGroup({ label, options, selected, onSelect }: { label: string; options: readonly string[]; selected: string; onSelect: (value: string) => void }) {
  return <fieldset className="configuration-filter-group"><legend>{label}</legend><div>{options.map((option) => <button type="button" key={option} className={selected === option ? "active" : ""} aria-pressed={selected === option} onClick={() => onSelect(option)}>{option}</button>)}</div></fieldset>;
}

function ConfigurationRow({ configuration, engagement, onOpen, onApply }: { configuration: MarketConfiguration; engagement: ConfigurationEngagement | undefined; onOpen: (configuration: MarketConfiguration) => void; onApply: (configuration: MarketConfiguration) => void }) {
  return <tr>
    <td data-label="配置名称"><span className="configuration-name-cell"><i aria-hidden="true"><PcCase size={22} /></i><span><strong className="configuration-name">{configuration.name}</strong>{configuration.description ? <small className="configuration-description">{configuration.description}</small> : null}</span></span></td>
    <td data-label="来源"><span className={`configuration-source ${configuration.source}`}>{configuration.source === "official" ? <CheckCircle2 size={16} /> : <span aria-hidden="true">{configuration.authorName.slice(0, 1)}</span>}<b>{configuration.source === "official" ? "官方" : configuration.authorName}</b></span></td>
    <td data-label="配置分类">{configuration.configurationClass}</td>
    <td data-label="参考总价"><strong className="configuration-price">{formatYuan(configuration.summary.totalFen)}</strong></td>
    <td data-label="互动数据"><span className="engagement-summary">推荐 {engagement?.recommendCount ?? 0}<i>·</i>评论 {engagement?.commentCount ?? 0}<i>·</i>点击率 {formatPercent(engagement?.clickRate ?? 0)}</span></td>
    <td data-label="综合分"><strong className="hybrid-score">{(engagement?.hybridScore ?? 20).toFixed(1)}</strong></td>
    <td data-label="操作"><div className="configuration-actions"><button type="button" onClick={() => onOpen(configuration)}>查看配置</button><button className="primary" type="button" onClick={() => onApply(configuration)}>采用配置</button></div></td>
  </tr>;
}

function compareConfigurations(left: MarketConfiguration, right: MarketConfiguration, sortMode: SortMode, metrics: Map<string, ConfigurationEngagement>) {
  const a = metrics.get(left.engagementKey);
  const b = metrics.get(right.engagementKey);
  if (sortMode === "recommend") return (b?.recommendCount ?? 0) - (a?.recommendCount ?? 0) || fallbackOrder(left, right);
  if (sortMode === "comments") return (b?.commentCount ?? 0) - (a?.commentCount ?? 0) || fallbackOrder(left, right);
  if (sortMode === "ctr") return (b?.clickRate ?? 0) - (a?.clickRate ?? 0) || fallbackOrder(left, right);
  if (sortMode === "newest") return (right.createdAt ?? "").localeCompare(left.createdAt ?? "") || fallbackOrder(left, right);
  return (b?.hybridScore ?? 20) - (a?.hybridScore ?? 20) || fallbackOrder(left, right);
}

function fallbackOrder(left: MarketConfiguration, right: MarketConfiguration) {
  return left.summary.totalFen - right.summary.totalFen || left.name.localeCompare(right.name, "zh-CN");
}

function formatPercent(value: number) { return `${(value * 100).toFixed(1)}%`; }
