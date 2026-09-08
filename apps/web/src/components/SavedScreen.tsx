import { ArrowRight, ClipboardList } from "lucide-react";
import type { BuildDraft, Part } from "@pc-assembly/domain";
import { summarizeBuild } from "@pc-assembly/domain";
import { formatYuan } from "../lib/format";

export default function SavedScreen({ savedDraft, parts, onOpen, onStart }: { savedDraft: BuildDraft | null; parts: Part[]; onOpen: () => void; onStart: () => void }) {
  const selectedParts = savedDraft ? parts.filter((part) => Object.values(savedDraft.selectedPartIds).includes(part.id)) : [];
  const summary = savedDraft ? summarizeBuild({ name: savedDraft.name, budgetFen: savedDraft.budgetFen, usage: savedDraft.usage, parts: selectedParts }) : null;
  return <main className="saved-screen"><div className="saved-heading"><h1>我的配置</h1><p>保存在当前浏览器中的装机方案。</p></div>{savedDraft && summary ? <article className="saved-build"><div className="saved-icon"><ClipboardList size={26} /></div><div><h2>{savedDraft.name}</h2><p>{summary.progress} 个配件 · {savedDraft.usage} · 预算 {formatYuan(savedDraft.budgetFen)}</p></div><strong>{formatYuan(summary.totalFen)}</strong><button type="button" onClick={onOpen}>打开配置 <ArrowRight size={17} /></button></article> : <section className="saved-empty"><ClipboardList size={38} /><h2>还没有保存的配置</h2><p>完成一次配件选择后，点击“保存配置”即可在这里查看。</p><button className="primary-button" type="button" onClick={onStart}>创建新配置</button></section>}</main>;
}
