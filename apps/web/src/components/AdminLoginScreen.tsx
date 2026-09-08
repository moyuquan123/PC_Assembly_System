import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useState } from "react";

export default function AdminLoginScreen({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState(import.meta.env.DEV ? "admin" : "");
  const [password, setPassword] = useState(import.meta.env.DEV ? "Admin123!" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try { await onLogin(username, password); } catch (caught) { setError(caught instanceof Error ? caught.message : "登录失败"); }
    finally { setLoading(false); }
  };
  return <main className="admin-login"><form className="admin-login-card" onSubmit={(event) => void submit(event)}><div className="admin-login-icon"><LockKeyhole size={26} /></div><h1>管理员登录</h1><p>维护配件价格、结构化规格和上下架状态。</p><label htmlFor="admin-username">用户名</label><input id="admin-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /><label htmlFor="admin-password">密码</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : null}登录</button>{import.meta.env.DEV ? <small>本地开发账号已预填；生产环境必须通过部署变量创建管理员。</small> : null}</form></main>;
}
