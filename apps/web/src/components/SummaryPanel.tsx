import { CheckCircle2, ChevronRight, TriangleAlert } from "lucide-react";
import type { BuildSummary, CompatibilityResult } from "@pc-assembly/domain";
import { categories } from "@pc-assembly/domain";
import { formatYuan } from "../lib/format";

export default function SummaryPanel({ build, budgetFen, issues, onOpen, compact = false }: {
  build: BuildSummary;
  budgetFen: number;
  issues: CompatibilityResult[];
  onOpen: () => void;
  compact?: boolean;
}) {
  const remaining = budgetFen - build.totalFen;
  const hasError = issues.some((issue) => issue.level === "incompatible");
  const hasWarning = issues.some((issue) => issue.level === "warning");
  const status = hasError ? { title: "存在不兼容项", tone: "error" } : hasWarning ? { title: "需要留意", tone: "warning" } : { title: "兼容性良好", tone: "success" };
  const leadingIssue = issues.find((issue) => issue.level === "incompatible") ?? issues.find((issue) => issue.level === "warning");
  if (compact) return <button className="mobile-summary-button" type="button" onClick={onOpen}><span><small>当前配置</small><strong>{formatYuan(build.totalFen)}</strong></span><span className={`mobile-status ${status.tone}`}>{status.title}</span><ChevronRight size={20} /></button>;

  return <aside className="summary-panel" aria-labelledby="summary-title">
    <div className="summary-title-row"><h2 id="summary-title">当前配置</h2><span>{build.progress} / {categories.length}</span></div>
    <div className="selected-parts">{build.parts.length === 0 ? <div className="empty-summary"><span>还没有选择配件</span><small>从左侧第一步开始吧</small></div> : build.parts.map((part) => <div className="summary-part" key={part.id}><span className="summary-part-label">{categories.find((item) => item.code === part.category)?.shortName}</span><span className="summary-part-name">{part.name}</span><strong>{formatYuan(part.priceFen)}</strong></div>)}</div>
    <dl className="totals"><div><dt>配置总价</dt><dd>{formatYuan(build.totalFen)}</dd></div><div><dt>预算{remaining >= 0 ? "剩余" : "超出"}</dt><dd className={remaining >= 0 ? "positive" : "negative"}>{remaining < 0 ? "−" : ""}{formatYuan(Math.abs(remaining))}</dd></div><div><dt>预计整机功耗</dt><dd>{build.estimatedPowerW}W</dd></div></dl>
    <div className={`compatibility-card ${status.tone}`}>{status.tone === "success" ? <CheckCircle2 size={21} /> : <TriangleAlert size={21} />}<div><strong>{status.title}</strong><p>{leadingIssue?.message ?? (build.progress === categories.length ? "所有已选配件均兼容，可以完成这套配置。" : "当前已选配件没有发现冲突，继续完成剩余步骤。")}</p></div></div>
    <button className="primary-button summary-action" type="button" onClick={onOpen}>查看完整配置 <ChevronRight size={20} /></button>
  </aside>;
}
