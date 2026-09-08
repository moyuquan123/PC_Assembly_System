import { CheckCircle2, Copy, TriangleAlert, X } from "lucide-react";
import { categories } from "../data/parts";

export default function BuildModal({
  isOpen,
  onClose,
  build,
  budget,
  buildName,
  issues,
  onCopy,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="build-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span>配置预览</span>
            <h2 id="modal-title">{buildName}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            <X size={21} />
          </button>
        </div>

        <div className="modal-build-list">
          {categories.map((category) => {
            const part = build.selectedParts.find(
              (selectedPart) => selectedPart.categoryId === category.id,
            );
            return (
              <div className={part ? "modal-build-row" : "modal-build-row missing"} key={category.id}>
                <span>{category.label}</span>
                <strong>{part?.name ?? "尚未选择"}</strong>
                <em>{part ? `¥${part.price.toLocaleString("zh-CN")}` : "—"}</em>
              </div>
            );
          })}
        </div>

        <div className="modal-overview">
          <div>
            <span>配置总价</span>
            <strong>¥{build.total.toLocaleString("zh-CN")}</strong>
          </div>
          <div>
            <span>预算</span>
            <strong>¥{budget.toLocaleString("zh-CN")}</strong>
          </div>
          <div>
            <span>预计功耗</span>
            <strong>{build.estimatedPower}W</strong>
          </div>
        </div>

        <div className={`modal-status ${issues.length > 0 ? issues[0].level : "success"}`}>
          {issues.length > 0 ? <TriangleAlert size={19} /> : <CheckCircle2 size={19} />}
          <span>{issues[0]?.message ?? "当前没有发现兼容性问题"}</span>
        </div>

        <div className="modal-actions">
          <p>这是模拟配置，价格与兼容性结果仅供流程演示。</p>
          <button className="primary-button" type="button" onClick={onCopy}>
            <Copy size={18} /> 复制配置单
          </button>
        </div>
      </section>
    </div>
  );
}
