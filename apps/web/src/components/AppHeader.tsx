import { FolderOpen, LogIn, Save, Sparkles } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>;
}

export default function AppHeader({ onSave }: { onSave: () => void }) {
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
        <NavLink to="/recommend"><Sparkles size={15} />智能推荐</NavLink>
        <NavLink to="/saved">我的配置</NavLink>
      </nav>
      {isAdmin ? (
        <button className="header-action" type="button" onClick={() => navigate("/")}><FolderOpen size={18} /><span>返回装机</span></button>
      ) : isBuilder ? (
        <button className="header-action" type="button" onClick={onSave}><Save size={18} /><span>保存配置</span></button>
      ) : (
        <button className="header-action" type="button" onClick={() => navigate("/admin/login")}><LogIn size={18} /><span>管理后台</span></button>
      )}
    </header>
  );
}
