import {
  Box,
  CircuitBoard,
  Cpu,
  Fan,
  HardDrive,
  MemoryStick,
  MonitorCog,
  Zap,
} from "lucide-react";

const categoryIcons = {
  cpu: Cpu,
  motherboard: CircuitBoard,
  gpu: MonitorCog,
  memory: MemoryStick,
  storage: HardDrive,
  psu: Zap,
  case: Box,
  cooler: Fan,
};

export default function StepRail({ categories, activeId, selection, onSelect }) {
  return (
    <aside className="step-rail" aria-label="配件选择步骤">
      {categories.map((category, index) => {
        const Icon = categoryIcons[category.id];
        const isSelected = Boolean(selection[category.id]);
        const isActive = activeId === category.id;

        return (
          <button
            className={`step-item${isActive ? " active" : ""}${
              isSelected ? " complete" : ""
            }`}
            key={category.id}
            type="button"
            aria-current={isActive ? "step" : undefined}
            onClick={() => onSelect(category.id)}
          >
            <span className="step-number">{index + 1}</span>
            <Icon className="step-icon" size={23} strokeWidth={1.75} />
            <span className="step-copy">
              <strong>{category.label}</strong>
              <small>{isSelected ? "已选择" : isActive ? "选择中" : "未选择"}</small>
            </span>
          </button>
        );
      })}
    </aside>
  );
}
