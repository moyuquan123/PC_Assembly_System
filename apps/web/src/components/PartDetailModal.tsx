import { X } from "lucide-react";
import type { Part } from "@pc-assembly/domain";
import { formatYuan } from "../lib/format";

export default function PartDetailModal({ part, onClose }: { part: Part | null; onClose: () => void }) {
  if (!part) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="build-modal part-detail-modal" role="dialog" aria-modal="true" aria-labelledby="part-detail-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="modal-header"><div><span>{part.brand}</span><h2 id="part-detail-title">{part.model}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={21} /></button></div>
    <div className="detail-price">{formatYuan(part.priceFen)}</div><dl className="detail-specs">{Object.entries(part.specs).filter(([key]) => key !== "kind").map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(" / ") : String(value)}</dd></div>)}</dl>
    <p className="detail-note">规格来自结构化配件数据，用于即时兼容性判断。最终购买前请以厂商页面为准。</p>
  </section></div>;
}
