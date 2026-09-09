import { ArrowRight, CheckCircle2, Gauge, LoaderCircle, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import type { RecommendationInput } from "@pc-assembly/contracts";
import { categories } from "@pc-assembly/domain";
import type { RecommendedBuild, Usage } from "@pc-assembly/domain";
import { getRecommendations } from "../lib/api";
import { formatYuan } from "../lib/format";

const usages: Usage[] = ["游戏", "办公", "内容创作"];

export default function RecommendationScreen({ onGenerated, onApply }: {
  onGenerated: (input: RecommendationInput, resultCount: number) => void;
  onApply: (recommendation: RecommendedBuild, input: RecommendationInput) => void;
}) {
  const [budgetYuan, setBudgetYuan] = useState("9000");
  const [usage, setUsage] = useState<Usage>("游戏");
  const [compact, setCompact] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [upgradeFriendly, setUpgradeFriendly] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendedBuild[]>([]);
  const [versions, setVersions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const budgetFen = Math.round(Number(budgetYuan) * 100);
  const valid = Number.isFinite(budgetFen) && budgetFen >= 200_000 && budgetFen <= 10_000_000;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    const input: RecommendationInput = { budgetFen, usage, preferences: { compact, quiet, upgradeFriendly } };
    setLoading(true);
    setError("");
    try {
      const response = await getRecommendations(input);
      setRecommendations(response.recommendations);
      setVersions(`推荐版本 ${response.recommendationVersion} · 兼容规则 ${response.ruleVersion}`);
      onGenerated(input, response.recommendations.length);
    } catch (caught) {
      setRecommendations([]);
      setError(caught instanceof Error ? caught.message : "暂时无法生成推荐，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const currentInput: RecommendationInput = { budgetFen, usage, preferences: { compact, quiet, upgradeFriendly } };

  return <main className="recommendation-screen">
    <section className="recommendation-hero">
      <div><span><Sparkles size={16} /> 智能推荐 Beta</span><h1>告诉我们目标，获得三套可靠配置</h1><p>推荐算法只从当前配件库中选择，并使用与装机工作台相同的兼容规则复核。你可以一键采用后继续替换任何部件。</p></div>
      <form className="recommendation-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="recommend-budget">整机预算</label>
        <div className="recommend-budget"><span>¥</span><input id="recommend-budget" type="number" min="2000" max="100000" step="500" value={budgetYuan} onChange={(event) => setBudgetYuan(event.target.value)} /></div>
        <fieldset><legend>主要用途</legend><div className="recommend-usage">{usages.map((item) => <button type="button" key={item} className={usage === item ? "active" : ""} aria-pressed={usage === item} onClick={() => setUsage(item)}>{item}</button>)}</div></fieldset>
        <fieldset><legend>额外偏好</legend><div className="preference-list">
          <label><input type="checkbox" checked={upgradeFriendly} onChange={(event) => setUpgradeFriendly(event.target.checked)} /><span><strong>方便升级</strong><small>偏向较新平台和更充足供电</small></span></label>
          <label><input type="checkbox" checked={compact} onChange={(event) => setCompact(event.target.checked)} /><span><strong>紧凑机身</strong><small>优先较小尺寸的兼容机箱</small></span></label>
          <label><input type="checkbox" checked={quiet} onChange={(event) => setQuiet(event.target.checked)} /><span><strong>低功耗安静</strong><small>优先控制整机预计功耗</small></span></label>
        </div></fieldset>
        <button className="primary-button recommendation-submit" type="submit" disabled={!valid || loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}{loading ? "正在计算兼容组合…" : "生成三套推荐"}</button>
        {!valid ? <p className="form-error">请输入 2,000～100,000 元的整机预算。</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </form>
    </section>

    {recommendations.length > 0 ? <section className="recommendation-results" aria-labelledby="recommendation-results-title">
      <div className="recommendation-results-heading"><div><span>已通过兼容复核</span><h2 id="recommendation-results-title">为你生成的配置</h2></div><small>{versions}</small></div>
      <div className="recommendation-grid">{recommendations.map((recommendation) => <RecommendationCard key={recommendation.strategy} recommendation={recommendation} budgetFen={budgetFen} onApply={() => onApply(recommendation, currentInput)} />)}</div>
      <p className="recommendation-disclaimer">推荐基于当前目录、参考价格和结构化规格计算，不代表实时市场最低价。购买前仍需核对厂商支持列表与商品页面。</p>
    </section> : null}
  </main>;
}

function RecommendationCard({ recommendation, budgetFen, onApply }: { recommendation: RecommendedBuild; budgetFen: number; onApply: () => void }) {
  const difference = budgetFen - recommendation.summary.totalFen;
  return <article className={`recommendation-card strategy-${recommendation.strategy}`}>
    <header><span>{recommendation.strategy === "balanced" ? "首选" : "备选"}</span><h3>{recommendation.label}</h3><p>{recommendation.reasons[0]}</p></header>
    <div className="recommendation-price"><strong>{formatYuan(recommendation.summary.totalFen)}</strong><span className={difference >= 0 ? "positive" : "negative"}>{difference >= 0 ? `剩余 ${formatYuan(difference)}` : `超出 ${formatYuan(Math.abs(difference))}`}</span></div>
    <div className="recommendation-metrics"><span><Gauge size={16} />预计 {recommendation.summary.estimatedPowerW}W</span><span><Zap size={16} />建议电源 {recommendation.summary.requiredPsuPowerW}W+</span></div>
    <div className="recommendation-parts">{categories.map((category) => {
      const part = recommendation.parts.find((item) => item.category === category.code);
      return <div key={category.code}><span>{category.shortName}</span><strong>{part?.name}</strong><em>{part ? formatYuan(part.priceFen) : "—"}</em></div>;
    })}</div>
    <div className="recommendation-check"><CheckCircle2 size={18} /><span>八类配件完整，未发现明确兼容冲突</span></div>
    <ul>{recommendation.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}</ul>
    <button className="primary-button" type="button" onClick={onApply}>采用并继续调整 <ArrowRight size={18} /></button>
  </article>;
}
