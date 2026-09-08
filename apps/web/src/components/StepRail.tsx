import { Box, CircuitBoard, Cpu, Fan, HardDrive, MemoryStick, MonitorCog, Zap } from "lucide-react";
import type { Category, CategoryCode } from "@pc-assembly/domain";

const categoryIcons = { cpu: Cpu, motherboard: CircuitBoard, gpu: MonitorCog, memory: MemoryStick, storage: HardDrive, psu: Zap, case: Box, cooler: Fan };

export default function StepRail({ categories, activeId, selection, onSelect }: {
  categories: Category[];
  activeId: CategoryCode;
  selection: Partial<Record<CategoryCode, string>>;
  onSelect: (category: CategoryCode) => void;
}) {
  return <aside className="step-rail" aria-label="配件选择步骤">{categories.map((category, index) => {
    const Icon = categoryIcons[category.code];
    const isSelected = Boolean(selection[category.code]);
    const isActive = activeId === category.code;
    return <button className={`step-item${isActive ? " active" : ""}${isSelected ? " complete" : ""}`} key={category.code} type="button" aria-current={isActive ? "step" : undefined} onClick={() => onSelect(category.code)}>
      <span className="step-number">{index + 1}</span><Icon className="step-icon" size={23} strokeWidth={1.75} />
      <span className="step-copy"><strong>{category.name}</strong><small>{isSelected ? "已选择" : isActive ? "选择中" : "未选择"}</small></span>
    </button>;
  })}</aside>;
}
