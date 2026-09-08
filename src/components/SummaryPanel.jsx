import { CheckCircle2, ChevronRight, TriangleAlert } from "lucide-react";
import { categories } from "../data/parts";

export default function SummaryPanel({
  build,
  budget,
  issues,
  onOpen,
  compact = false,
}) {
  const remaining = budget - build.total;
  const hasError = issues.some((issue) => issue.level === "error");
  const hasWarning = issues.some((issue) => issue.level === "warning");
  const status = hasError
    ? { title: "存在不兼容项", tone: "error" }
    : hasWarning
      ? { title: "需要留意", tone: "warning" }
      : { title: "兼容性良好", tone: "success" };

  if (compact) {
    return (
      <button className="mobile-summary-button" type="button" onClick={onOpen}>
        <span>
          <small>当前配置</small>
          <strong>¥{build.total.toLocaleString("zh-CN")}</strong>
        </span>
        <span className={`mobile-status ${status.tone}`}>{status.title}</span>
        <ChevronRight size={20} />
      </button>
    );
  }

  return (
    <aside className="summary-panel" aria-labelledby="summary-title">
      <div className="summary-title-row">
        <h2 id="summary-title">当前配置</h2>
        <span>{build.progress} / {categories.length}</span>
      </div>

      <div className="selected-parts">
        {build.selectedParts.length === 0 ? (
          <div className="empty-summary">
            <span>还没有选择配件</span>
            <small>从左侧第一步开始吧</small>
          </div>
        ) : (
          build.selectedParts.map((part) => {
            const category = categories.find((item) => item.id === part.categoryId);
            return (
              <div className="summary-part" key={part.id}>
                <span className="summary-part-label">{category.shortLabel}</span>
                <span className="summary-part-name">{part.name}</span>
                <strong>¥{part.price.toLocaleString("zh-CN")}</strong>
              </div>
            );
          })
        )}
      </div>

      <dl className="totals">
        <div>
          <dt>配置总价</dt>
          <dd>¥{build.total.toLocaleString("zh-CN")}</dd>
        </div>
        <div>
          <dt>预算{remaining >= 0 ? "剩余" : "超出"}</dt>
          <dd className={remaining >= 0 ? "positive" : "negative"}>
            {remaining < 0 ? "−" : ""}¥{Math.abs(remaining).toLocaleString("zh-CN")}
          </dd>
        </div>
        <div>
          <dt>预计整机功耗</dt>
          <dd>{build.estimatedPower}W</dd>
        </div>
      </dl>

      <div className={`compatibility-card ${status.tone}`}>
        {status.tone === "success" ? (
          <CheckCircle2 size={21} />
        ) : (
          <TriangleAlert size={21} />
        )}
        <div>
          <strong>{status.title}</strong>
          <p>
            {issues[0]?.message ??
              (build.progress === categories.length
                ? "所有已选配件均兼容，可以完成这套配置。"
                : "当前已选配件没有发现冲突，继续完成剩余步骤。")}
          </p>
        </div>
      </div>

      <button className="primary-button summary-action" type="button" onClick={onOpen}>
        查看完整配置 <ChevronRight size={20} />
      </button>
    </aside>
  );
}
