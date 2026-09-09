import { Gauge, Gamepad2, PencilLine } from "lucide-react";
import { useMemo, useState } from "react";
import { categories, checkCompatibility, summarizeBuild } from "@pc-assembly/domain";
import type { BuildDraft, CategoryCode, Part } from "@pc-assembly/domain";
import BuildModal from "./BuildModal";
import ConfigurationOverview from "./ConfigurationOverview";
import PartDetailModal from "./PartDetailModal";
import ProductCatalog from "./ProductCatalog";
import StepRail from "./StepRail";
import SummaryPanel from "./SummaryPanel";
import { formatYuan } from "../lib/format";

export default function BuilderScreen({ draft, parts, loading, error, onChoose, onEditSetup, onCopy, onShare }: {
  draft: BuildDraft;
  parts: Part[];
  loading: boolean;
  error: string;
  onChoose: (category: CategoryCode, partId: string) => void;
  onEditSetup: () => void;
  onCopy: () => Promise<void>;
  onShare: () => Promise<string>;
}) {
  const firstIncomplete = categories.find((category) => !draft.selectedPartIds[category.code])?.code ?? "cpu";
  const [activeCategoryId, setActiveCategoryId] = useState<CategoryCode>(firstIncomplete);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [detailPart, setDetailPart] = useState<Part | null>(null);
  const activeCategory = categories.find((category) => category.code === activeCategoryId)!;
  const selectedParts = useMemo(() => categories.flatMap((category) => { const id = draft.selectedPartIds[category.code]; const found = id ? parts.find((part) => part.id === id) : undefined; return found ? [found] : []; }), [draft.selectedPartIds, parts]);
  const snapshot = useMemo(() => ({ name: draft.name, budgetFen: draft.budgetFen, usage: draft.usage, parts: selectedParts }), [draft.budgetFen, draft.name, draft.usage, selectedParts]);
  const build = useMemo(() => summarizeBuild(snapshot), [snapshot]);
  const issues = useMemo(() => checkCompatibility(snapshot), [snapshot]);

  const choose = (productId: string) => {
    onChoose(activeCategoryId, productId);
    const currentIndex = categories.findIndex((category) => category.code === activeCategoryId);
    const next = categories.find((category, index) => index > currentIndex && !draft.selectedPartIds[category.code]);
    if (next) setActiveCategoryId(next.code);
  };

  const selectFromOverview = (category: CategoryCode) => {
    setActiveCategoryId(category);
    document.getElementById("catalog-title")?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  };

  return <main className="builder-screen">
    <section className="setup-strip" aria-label="装机目标摘要"><button type="button" onClick={onEditSetup}><span>预算</span><strong>{formatYuan(draft.budgetFen)}</strong><PencilLine size={16} /></button><div><Gamepad2 size={21} /><span>用途</span><strong>{draft.usage}</strong></div><div className="progress-summary"><Gauge size={21} /><span>装机进度</span><strong>{build.progress} / {categories.length}</strong><i><b style={{ width: `${(build.progress / categories.length) * 100}%` }} /></i></div></section>
    {!loading && !error ? <ConfigurationOverview build={build} budgetFen={draft.budgetFen} buildName={draft.name} activeCategoryId={activeCategoryId} issues={issues} onSelectCategory={selectFromOverview} onOpen={() => setIsSummaryOpen(true)} /> : null}
    {loading ? <section className="page-state"><LoaderLabel text="正在加载配件目录…" /></section> : error ? <section className="page-state error-state"><h1>配件目录加载失败</h1><p>{error}</p><button type="button" onClick={() => window.location.reload()}>重新加载</button></section> : <div className="builder-layout">
      <StepRail categories={categories} activeId={activeCategoryId} selection={draft.selectedPartIds} onSelect={setActiveCategoryId} />
      <ProductCatalog key={activeCategory.code} category={activeCategory} products={parts.filter((part) => part.category === activeCategoryId)} selectedId={draft.selectedPartIds[activeCategoryId]} snapshot={snapshot} onChoose={choose} onOpenDetail={setDetailPart} />
      <SummaryPanel build={build} budgetFen={draft.budgetFen} issues={issues} onOpen={() => setIsSummaryOpen(true)} />
    </div>}
    {!loading && !error ? <SummaryPanel compact build={build} budgetFen={draft.budgetFen} issues={issues} onOpen={() => setIsSummaryOpen(true)} /> : null}
    <BuildModal isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} build={build} budgetFen={draft.budgetFen} buildName={draft.name} issues={issues} onCopy={onCopy} onShare={onShare} />
    <PartDetailModal part={detailPart} onClose={() => setDetailPart(null)} />
  </main>;
}

function LoaderLabel({ text }: { text: string }) { return <p>{text}</p>; }
