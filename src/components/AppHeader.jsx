import { FolderOpen, Save } from "lucide-react";

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function AppHeader({ screen, onNavigate, onSave }) {
  return (
    <header className="app-header">
      <button className="brand" type="button" onClick={() => onNavigate("setup")}>
        <BrandMark />
        <span>装机清单</span>
      </button>

      <nav className="main-nav" aria-label="主导航">
        <button
          className={screen === "setup" || screen === "builder" ? "active" : ""}
          type="button"
          onClick={() => onNavigate("setup")}
        >
          开始装机
        </button>
        <button
          className={screen === "saved" ? "active" : ""}
          type="button"
          onClick={() => onNavigate("saved")}
        >
          我的配置
        </button>
      </nav>

      <button className="header-action" type="button" onClick={onSave}>
        {screen === "builder" ? <Save size={18} /> : <FolderOpen size={18} />}
        <span>{screen === "builder" ? "保存配置" : "打开配置"}</span>
      </button>
    </header>
  );
}
