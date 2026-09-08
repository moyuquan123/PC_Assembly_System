import { CheckCircle2, Copy, TriangleAlert } from "lucide-react";
import type { SavedBuildResponse } from "../lib/api";
import { categories } from "@pc-assembly/domain";
import { formatYuan } from "../lib/format";

export default function SharedBuildScreen({ build, loading, error }: { build: SavedBuildResponse | undefined; loading: boolean; error: string }) {
  if (loading) return <main className="page-state"><p>正在读取分享配置…</p></main>;
  if (error || !build) return <main className="page-state error-state"><h1>无法打开这套配置</h1><p>{error || "分享链接不存在或已失效。"}</p></main>;
  const hasWarning = build.checks.some((item) => item.level === "warning");
  return <main className="shared-screen"><header className="shared-heading"><div><span>只读分享配置</span><h1>{build.name}</h1><p>{build.usage} · 创建于 {new Date(build.createdAt).toLocaleDateString("zh-CN")} · 规则版本 {build.ruleVersion}</p></div><button className="secondary-button" type="button" onClick={() => navigator.clipboard.writeText(window.location.href)}><Copy size={17} />复制链接</button></header>
    <section className="shared-overview"><div><span>配置总价</span><strong>{formatYuan(build.summary.totalFen)}</strong></div><div><span>预算差额</span><strong className={build.budgetFen >= build.summary.totalFen ? "positive" : "negative"}>{formatYuan(Math.abs(build.budgetFen - build.summary.totalFen))}</strong></div><div><span>预计功耗</span><strong>{build.summary.estimatedPowerW}W</strong></div></section>
    <section className="shared-list" aria-label="配置配件">{categories.map((category) => { const part = build.parts.find((item) => item.category === category.code); return <article key={category.code}><span>{category.name}</span><div><strong>{part?.name}</strong><small>{part?.displaySpecs.join(" · ")}</small></div><em>{part ? formatYuan(part.priceFen) : "—"}</em></article>; })}</section>
    <div className={`shared-status ${hasWarning ? "warning" : "success"}`}>{hasWarning ? <TriangleAlert size={22} /> : <CheckCircle2 size={22} />}<div><strong>{hasWarning ? "配置包含需人工确认的项目" : "服务端兼容校验通过"}</strong><p>{hasWarning ? build.checks.find((item) => item.level === "warning")?.message : "未发现已覆盖规则中的冲突。购买前仍请核对厂商规格。"}</p></div></div>
  </main>;
}
