import { FolderOpen, Save, UserRound } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { PublicUser } from "../lib/api";

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>;
}

export default function AppHeader({ onSave, user, onAccount }: { onSave: () => void; user: PublicUser | undefined; onAccount: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isBuilder = location.pathname === "/builder";
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <header className="app-header">
      <button className="brand" type="button" onClick={() => navigate("/")}>
        <BrandMark /><span>装机清单</span>
      </button>
      <nav className="main-nav" aria-label="主导航">
        <NavLink to="/" className={({ isActive }) => isActive || isBuilder ? "active" : ""}>开始装机</NavLink>
        <NavLink to="/configurations">配置总览</NavLink>
        <NavLink to="/recommend">配置方案</NavLink>
        <NavLink to="/me">我的</NavLink>
      </nav>
      {isAdmin ? (
        <button className="header-action" type="button" onClick={() => navigate("/")}><FolderOpen size={18} /><span>返回装机</span></button>
      ) : (
        <div className="header-actions">
          {isBuilder ? <button className="header-action secondary" type="button" onClick={onSave}><Save size={18} /><span>保存配置</span></button> : <button className="admin-entry" type="button" onClick={() => navigate("/admin/login")}>管理后台</button>}
          <button className="header-account" type="button" onClick={onAccount}><UserRound size={19} /><span>{user?.displayName ?? "登录 / 注册"}</span></button>
        </div>
      )}
    </header>
  );
}
