import { Check, CheckCircle2, ChevronRight, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { categories } from "@pc-assembly/domain";
import type { BuildSummary, CategoryCode, CompatibilityResult } from "@pc-assembly/domain";
import { formatYuan } from "../lib/format";

export default function ConfigurationOverview({ build, budgetFen, buildName, activeCategoryId, issues, onSelectCategory, onOpen }: {
  build: BuildSummary;
  budgetFen: number;
  buildName: string;
  activeCategoryId: CategoryCode;
  issues: CompatibilityResult[];
  onSelectCategory: (category: CategoryCode) => void;
  onOpen: () => void;
}) {
  const partByCategory = useMemo(() => new Map(build.parts.map((part) => [part.category, part])), [build.parts]);
  const remaining = budgetFen - build.totalFen;
  const hasError = issues.some((issue) => issue.level === "incompatible");
  const hasWarning = issues.some((issue) => issue.level === "warning");
  const status = hasError
    ? { label: "存在不兼容项", tone: "error" }
    : hasWarning
      ? { label: "有项目待确认", tone: "warning" }
      : { label: build.progress === categories.length ? "兼容检查通过" : "当前搭配正常", tone: "success" };

  return <section className="configuration-overview" aria-labelledby="configuration-overview-title">
    <header className="configuration-overview-heading">
      <div><span>实时汇总</span><h2 id="configuration-overview-title">配置总览</h2><p>{buildName} · 已完成 {build.progress} / {categories.length}</p></div>
      <button className="overview-detail-button" type="button" onClick={onOpen}>查看完整配置 <ChevronRight size={18} /></button>
    </header>
    <div className="configuration-overview-body">
      <div className="overview-part-grid" aria-label="八类配件概览">
        {categories.map((category, index) => {
          const part = partByCategory.get(category.code);
          return <button
            className={`overview-part${part ? " selected" : ""}${activeCategoryId === category.code ? " active" : ""}`}
            type="button"
            key={category.code}
            onClick={() => onSelectCategory(category.code)}
            aria-label={part ? `查看${category.shortName}：${part.name}` : `选择${category.shortName}配件`}
          >
            <span>{index + 1}</span>
            <div><small>{category.shortName}</small><strong>{part?.name ?? "待选择"}</strong></div>
            {part ? <Check size={15} /> : null}
          </button>;
        })}
      </div>
      <dl className="overview-metrics">
        <div><dt>配置总价</dt><dd>{formatYuan(build.totalFen)}</dd></div>
        <div><dt>预算{remaining >= 0 ? "剩余" : "超出"}</dt><dd className={remaining >= 0 ? "positive" : "negative"}>{remaining < 0 ? "−" : ""}{formatYuan(Math.abs(remaining))}</dd></div>
        <div><dt>预计功耗</dt><dd>{build.estimatedPowerW}W</dd></div>
        <div className={`overview-status ${status.tone}`}><dt>{status.tone === "success" ? <CheckCircle2 size={17} /> : <TriangleAlert size={17} />}兼容状态</dt><dd>{status.label}</dd></div>
      </dl>
    </div>
  </section>;
}
