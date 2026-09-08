import { CheckCircle2, Copy, Link2, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { categories } from "@pc-assembly/domain";
import type { BuildSummary, CompatibilityResult } from "@pc-assembly/domain";
import { formatYuan } from "../lib/format";

export default function BuildModal({ isOpen, onClose, build, budgetFen, buildName, issues, onCopy, onShare }: {
  isOpen: boolean;
  onClose: () => void;
  build: BuildSummary;
  budgetFen: number;
  buildName: string;
  issues: CompatibilityResult[];
  onCopy: () => Promise<void>;
  onShare: () => Promise<string>;
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  if (!isOpen) return null;
  const hasError = issues.some((issue) => issue.level === "incompatible");
  const hasWarning = issues.some((issue) => issue.level === "warning");
  const complete = build.progress === categories.length;
  const remaining = budgetFen - build.totalFen;

  const share = async () => {
    setIsSharing(true); setShareError("");
    try { setShareUrl(await onShare()); } catch (error) { setShareError(error instanceof Error ? error.message : "分享失败，请稍后重试。"); }
    finally { setIsSharing(false); }
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="build-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="modal-header"><div><span>配置预览</span><h2 id="modal-title">{buildName}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={21} /></button></div>
    <div className="modal-build-list">{categories.map((category) => { const part = build.parts.find((item) => item.category === category.code); return <div className={part ? "modal-build-row" : "modal-build-row missing"} key={category.code}><span>{category.name}</span><strong>{part?.name ?? "尚未选择"}</strong><em>{part ? formatYuan(part.priceFen) : "—"}</em></div>; })}</div>
    <div className="modal-overview"><div><span>配置总价</span><strong>{formatYuan(build.totalFen)}</strong></div><div><span>预算{remaining >= 0 ? "剩余" : "超出"}</span><strong>{remaining < 0 ? "−" : ""}{formatYuan(Math.abs(remaining))}</strong></div><div><span>预计功耗</span><strong>{build.estimatedPowerW}W</strong></div></div>
    <div className={`modal-status ${hasError ? "error" : hasWarning ? "warning" : "success"}`}>{hasError || hasWarning ? <TriangleAlert size={19} /> : <CheckCircle2 size={19} />}<span>{hasError ? "配置存在不兼容项，请返回更换配件。" : hasWarning ? "配置可用，但仍有项目需要人工确认。" : complete ? "当前没有发现兼容性问题。" : "已选配件暂无冲突，请完成剩余步骤。"}</span></div>
    {shareUrl ? <div className="share-result"><label htmlFor="share-url">分享链接已生成</label><div><input id="share-url" readOnly value={shareUrl} /><button type="button" onClick={() => navigator.clipboard.writeText(shareUrl)}><Copy size={17} />复制</button></div></div> : null}
    {shareError ? <p className="form-error" role="alert">{shareError}</p> : null}
    <div className="modal-actions"><p>兼容性结果用于辅助决策，最终请结合厂商支持列表和产品规格确认。</p><div className="modal-action-buttons"><button className="secondary-button" type="button" onClick={() => void onCopy()}><Copy size={17} />复制清单</button><button className="primary-button" type="button" disabled={!complete || hasError || isSharing} onClick={() => void share()}>{isSharing ? <LoaderCircle className="spin" size={17} /> : <Link2 size={17} />}生成分享链接</button></div></div>
  </section></div>;
}
