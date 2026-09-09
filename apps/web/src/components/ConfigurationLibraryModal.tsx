import { CheckCircle2, TriangleAlert, X } from "lucide-react";
import { categories } from "@pc-assembly/domain";
import type { MarketConfiguration } from "../lib/configuration-library";
import { formatYuan } from "../lib/format";

export default function ConfigurationLibraryModal({ configuration, onClose, onApply }: {
  configuration: MarketConfiguration | null;
  onClose: () => void;
  onApply: (configuration: MarketConfiguration) => void;
}) {
  if (!configuration) return null;
  const hasWarning = configuration.checks.some((check) => check.level === "warning");

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="build-modal library-modal" role="dialog" aria-modal="true" aria-labelledby="library-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-header"><div><span>{configuration.platform} · {configuration.configurationClass}</span><h2 id="library-modal-title">{configuration.name}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={21} /></button></div>
      <div className="modal-build-list">{categories.map((category) => { const part = configuration.summary.parts.find((item) => item.category === category.code)!; return <div className="modal-build-row" key={category.code}><span>{category.name}</span><strong>{part.name}</strong><em>{formatYuan(part.priceFen)}</em></div>; })}</div>
      <div className="modal-overview"><div><span>参考总价</span><strong>{formatYuan(configuration.summary.totalFen)}</strong></div><div><span>建议预算</span><strong>{formatYuan(configuration.referenceBudgetFen)}</strong></div><div><span>预计功耗</span><strong>{configuration.summary.estimatedPowerW}W</strong></div></div>
      <div className={`modal-status ${hasWarning ? "warning" : "success"}`}>{hasWarning ? <TriangleAlert size={19} /> : <CheckCircle2 size={19} />}<span>{hasWarning ? "配置可用，但有项目需要结合厂商支持列表确认。" : "当前配置已通过已覆盖的兼容性规则检查。"}</span></div>
      <div className="library-modal-actions"><p>价格为当前配件库参考价，购买前请再次核对库存、价格和厂商规格。</p><button className="primary-button" type="button" onClick={() => onApply(configuration)}>采用此配置</button></div>
    </section>
  </div>;
}
