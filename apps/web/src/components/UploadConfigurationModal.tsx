import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { categories, getPartsByIds, summarizeBuild } from "@pc-assembly/domain";
import type { BuildDraft, Part } from "@pc-assembly/domain";
import type { ConfigurationClass } from "../lib/configuration-library";
import { formatYuan } from "../lib/format";

export interface ConfigurationSubmissionFields {
  name: string;
  configurationClass: ConfigurationClass;
  description: string;
}

export default function UploadConfigurationModal({ open, draft, parts, authorName, onClose, onGoToBuilder, onSubmit }: {
  open: boolean;
  draft: BuildDraft;
  parts: Part[];
  authorName: string;
  onClose: () => void;
  onGoToBuilder: () => void;
  onSubmit: (fields: ConfigurationSubmissionFields) => Promise<void>;
}) {
  if (!open) return null;
  return <UploadConfigurationForm draft={draft} parts={parts} authorName={authorName} onClose={onClose} onGoToBuilder={onGoToBuilder} onSubmit={onSubmit} />;
}

function UploadConfigurationForm({ draft, parts, authorName, onClose, onGoToBuilder, onSubmit }: Omit<Parameters<typeof UploadConfigurationModal>[0], "open">) {
  const selectedParts = getPartsByIds(draft.selectedPartIds, parts);
  const complete = selectedParts.length === categories.length;
  const summary = summarizeBuild({ name: draft.name, budgetFen: draft.budgetFen, usage: draft.usage, parts: selectedParts });
  const [name, setName] = useState(draft.name);
  const [configurationClass, setConfigurationClass] = useState<ConfigurationClass>(draft.usage === "办公" ? "办公入门" : draft.usage === "内容创作" ? "内容创作" : "主流游戏");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!complete || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ name, configurationClass, description });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "上传失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="modal-backdrop upload-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="build-modal upload-configuration-modal" role="dialog" aria-modal="true" aria-labelledby="upload-configuration-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-header"><div><h2 id="upload-configuration-title">上传我的配置</h2><p>将当前已完成的八类配件配置发布到配置方案。</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={21} /></button></div>
      <div className={`upload-current-summary ${complete ? "complete" : "incomplete"}`}>
        <span className="upload-summary-icon">{complete ? <CheckCircle2 size={27} /> : <TriangleAlert size={27} />}</span>
        <div><strong>{draft.name}</strong><small>{complete ? "当前配置" : `还差 ${categories.length - selectedParts.length} 类配件`}</small></div>
        <div><strong>{selectedParts.length} / {categories.length}</strong><small>{complete ? "已完成" : "未完成"}</small></div>
        <div><strong>{formatYuan(summary.totalFen)}</strong><small>参考总价</small></div>
      </div>
      {!complete ? <div className="upload-incomplete-message"><p>完成八类配件后即可公开投稿，系统会在上传前复核兼容性。</p><button type="button" onClick={onGoToBuilder}>继续完成配置</button></div> : <form className="upload-configuration-form" onSubmit={submit}>
        <div className="upload-author"><span>发布账号</span><strong>{authorName}</strong></div>
        <label><span>方案名称</span><input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：我的 2K 游戏主机" /></label>
        <label><span>配置分类</span><select value={configurationClass} onChange={(event) => setConfigurationClass(event.target.value as ConfigurationClass)}><option>办公入门</option><option>主流游戏</option><option>高性能游戏</option><option>内容创作</option></select></label>
        <label><span>推荐理由（选填）</span><textarea aria-label="推荐理由（选填）" maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="简单说说这套配置适合谁…" /><small>{description.length} / 200</small></label>
        <div className="upload-check-note"><Info size={18} /><span>上传前会自动检查配件完整性与兼容性。<small>方案会显示你的公开名称，不会公开登录信息。</small></span></div>
        {error ? <p className="upload-error" role="alert">{error}</p> : null}
        <div className="upload-modal-actions"><button className="secondary-button" type="button" onClick={onClose}>取消</button><button className="primary-button" type="submit" disabled={submitting}>{submitting ? "正在检查…" : "检查并上传"}</button></div>
      </form>}
    </section>
  </div>;
}
