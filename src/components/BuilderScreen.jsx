import { Gauge, Gamepad2, PencilLine } from "lucide-react";
import { categories, partsByCategory } from "../data/parts";
import ProductCatalog from "./ProductCatalog";
import StepRail from "./StepRail";
import SummaryPanel from "./SummaryPanel";

export default function BuilderScreen({
  form,
  selection,
  activeCategoryId,
  onSelectCategory,
  onChoose,
  build,
  issues,
  onOpenSummary,
  onEditSetup,
}) {
  const activeCategory = categories.find(
    (category) => category.id === activeCategoryId,
  );

  return (
    <main className="builder-screen">
      <section className="setup-strip" aria-label="装机目标摘要">
        <button type="button" onClick={onEditSetup}>
          <span>预算</span>
          <strong>¥{Number(form.budget).toLocaleString("zh-CN")}</strong>
          <PencilLine size={16} />
        </button>
        <div>
          <Gamepad2 size={21} />
          <span>用途</span>
          <strong>{form.usage}</strong>
        </div>
        <div className="progress-summary">
          <Gauge size={21} />
          <span>装机进度</span>
          <strong>{build.progress} / {categories.length}</strong>
          <i>
            <b style={{ width: `${(build.progress / categories.length) * 100}%` }} />
          </i>
        </div>
      </section>

      <div className="builder-layout">
        <StepRail
          categories={categories}
          activeId={activeCategoryId}
          selection={selection}
          onSelect={onSelectCategory}
        />
        <ProductCatalog
          key={activeCategory.id}
          category={activeCategory}
          products={partsByCategory[activeCategoryId]}
          selection={selection}
          onChoose={onChoose}
        />
        <SummaryPanel
          build={build}
          budget={Number(form.budget)}
          issues={issues}
          onOpen={onOpenSummary}
        />
      </div>

      <SummaryPanel
        compact
        build={build}
        budget={Number(form.budget)}
        issues={issues}
        onOpen={onOpenSummary}
      />
    </main>
  );
}
