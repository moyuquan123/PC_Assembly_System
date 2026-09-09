import { LogOut, UserRound, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import type { PublicUser } from "../lib/api";
import { loginUser, logoutUser, registerUser } from "../lib/api";

export default function UserAccountModal({ open, user, onClose, onAuthenticated, onLoggedOut }: {
  open: boolean;
  user: PublicUser | undefined;
  onClose: () => void;
  onAuthenticated: (user: PublicUser) => void;
  onLoggedOut: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const authenticated = mode === "login"
        ? await loginUser({ username, password })
        : await registerUser({ username, displayName, password });
      onAuthenticated(authenticated);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    setSubmitting(true);
    try {
      await logoutUser();
      onLoggedOut();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="modal-backdrop account-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-header"><div><h2 id="account-modal-title">{user ? "账号信息" : mode === "login" ? "登录账号" : "创建账号"}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={21} /></button></div>
      {user ? <div className="account-profile"><span><UserRound size={30} /></span><strong>{user.displayName}</strong><small>@{user.username}</small><p>已登录，可发布配置、发表评论和参与推荐。</p><button className="secondary-button" type="button" disabled={submitting} onClick={signOut}><LogOut size={17} />退出登录</button></div> : <>
        <div className="account-tabs" role="tablist" aria-label="账号操作"><button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>登录</button><button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>注册</button></div>
        <form className="account-form" onSubmit={submit}>
          <label><span>用户名</span><input aria-label="用户名" required minLength={3} maxLength={24} pattern="[a-z0-9_]+" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="3-24 位字母、数字或下划线" /></label>
          {mode === "register" ? <label><span>显示名称</span><input aria-label="显示名称" required minLength={2} maxLength={24} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="其他用户看到的名称" /></label> : null}
          <label><span>密码</span><input aria-label="密码" required minLength={8} maxLength={72} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" /></label>
          {error ? <p className="account-error" role="alert">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "请稍候…" : mode === "login" ? "登录" : "创建账号"}</button>
        </form>
        <p className="account-helper">登录后可发布配置、评论与推荐。</p>
      </>}
    </section>
  </div>;
}
