import { ArrowRight, BriefcaseBusiness, Gamepad2, PlaySquare } from "lucide-react";
import { useState } from "react";
import type { BuildDraft, Usage } from "@pc-assembly/domain";

const usages: Array<{ id: Usage; icon: typeof Gamepad2 }> = [
  { id: "游戏", icon: Gamepad2 }, { id: "办公", icon: BriefcaseBusiness }, { id: "内容创作", icon: PlaySquare }
];

function BuildIllustration() {
  return (
    <svg className="build-illustration" viewBox="0 0 620 410" role="img" aria-label="机箱、显卡、处理器和内存示意图">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M44 85 214 34l98 38v279l-170 31-98-42Z" /><path d="m214 34 98 38-72 21-98-34-98 26" />
        <path d="M142 59v323M240 93v243l72 15" /><path d="M64 111v208l56 26V79" opacity=".45" />
        <circle cx="91" cy="149" r="25" /><circle cx="91" cy="149" r="7" />
        <path d="M91 124c11 9 12 18 0 25M116 149c-9 11-18 12-25 0M91 174c-11-9-12-18 0-25M66 149c9-11 18-12 25 0" />
        <path d="M161 122h54v66h-54zM167 207h46v12h-46zM167 231h46v12h-46zM167 255h46v12h-46z" opacity=".65" />
        <path d="M330 103h190l38 30v83H330z" /><path d="M348 119h82v70h-82zM443 119h82v70h-82z" />
        <circle cx="389" cy="154" r="27" /><circle cx="484" cy="154" r="27" /><path d="M520 103v113M558 133h17v38h-17M310 159h-43" strokeDasharray="6 6" />
        <rect x="388" y="245" width="99" height="86" rx="4" /><rect x="409" y="264" width="57" height="48" rx="3" /><path d="M388 288h-72" strokeDasharray="6 6" />
        <path d="M345 361h205v34H345zM361 368h23v19h-23zM397 368h23v19h-23zM451 368h23v19h-23zM487 368h23v19h-23zM550 372h18v15h-18" /><path d="M345 378h-66" strokeDasharray="6 6" />
      </g><text x="419" y="295" fill="currentColor" fontSize="18" fontWeight="700">CPU</text>
    </svg>
  );
}

export default function SetupScreen({ draft, hasSavedDraft, onStart, onContinue }: {
  draft: BuildDraft;
  hasSavedDraft: boolean;
  onStart: (setup: Pick<BuildDraft, "name" | "budgetFen" | "usage">) => void;
  onContinue: () => void;
}) {
  const [budgetYuan, setBudgetYuan] = useState(String(draft.budgetFen / 100));
  const [usage, setUsage] = useState<Usage>(draft.usage);
  const [name, setName] = useState(draft.name);
  const isValid = Number(budgetYuan) >= 2000 && name.trim().length > 0;

  return (
    <main className="setup-screen">
      <section className="setup-intro">
        <h1>先定目标，再选配件</h1>
        <p>告诉我们你的预算和主要用途，后续每一步都会围绕这个目标展开。</p>
        <BuildIllustration />
      </section>
      <section className="setup-panel" aria-labelledby="setup-title">
        <h2 id="setup-title">创建新配置</h2>
        <label className="field-label" htmlFor="budget">整机预算</label>
        <div className="budget-input"><span>¥</span><input id="budget" type="number" min="2000" step="500" value={budgetYuan} onChange={(event) => setBudgetYuan(event.target.value)} /></div>
        <p className="field-help">后续可以随时调整</p>
        <fieldset className="usage-fieldset"><legend>主要用途</legend><div className="usage-options">
          {usages.map(({ id, icon: Icon }) => <button className={usage === id ? "usage-option selected" : "usage-option"} key={id} type="button" aria-pressed={usage === id} onClick={() => setUsage(id)}><Icon size={22} /><span>{id}</span></button>)}
        </div></fieldset>
        <label className="field-label" htmlFor="build-name">配置名称</label>
        <input className="text-input" id="build-name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
        <button className="primary-button setup-submit" type="button" disabled={!isValid} onClick={() => onStart({ name: name.trim(), budgetFen: Math.round(Number(budgetYuan) * 100), usage })}><span>开始选择配件</span><ArrowRight size={20} /></button>
        <button className="text-button" type="button" disabled={!hasSavedDraft} onClick={onContinue}>继续上次的配置 <ArrowRight size={16} /></button>
      </section>
      <ol className="journey-steps" aria-label="装机流程">{["设定目标", "选择配件", "检查兼容", "完成配置"].map((step, index) => <li className={index === 0 ? "active" : ""} key={step}><span>{index + 1}</span><strong>{step}</strong></li>)}</ol>
    </main>
  );
}
