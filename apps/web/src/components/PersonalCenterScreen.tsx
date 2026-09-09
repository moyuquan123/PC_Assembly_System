import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Clock3, MapPin, MessageSquare, PcCase, Plus, Settings, ThumbsDown, ThumbsUp, UserRound } from "lucide-react";
import { useState } from "react";
import type { BuildDraft, Part } from "@pc-assembly/domain";
import { summarizeBuild } from "@pc-assembly/domain";
import { ApiClientError, getUserDashboard, updateCurrentUser } from "../lib/api";
import type { PublicUser } from "../lib/api";

type Tab = "configurations" | "published" | "activity" | "settings";

export default function PersonalCenterScreen({ user, savedDraft, parts, onRequireAccount, onCreate, onOpenDraft, onOpenPublished }: {
  user: PublicUser | undefined;
  savedDraft: BuildDraft | null;
  parts: Part[];
  onRequireAccount: () => void;
  onCreate: () => void;
  onOpenDraft: () => void;
  onOpenPublished: () => void;
}) {
  const [tab, setTab] = useState<Tab>("configurations");
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ["user-dashboard"], queryFn: getUserDashboard, enabled: Boolean(user), retry: false });
  const localSummary = savedDraft ? summarizeBuild({ name: savedDraft.name, budgetFen: savedDraft.budgetFen, usage: savedDraft.usage, parts: parts.filter((part) => Object.values(savedDraft.selectedPartIds).includes(part.id)) }) : undefined;

  if (!user) return <main className="personal-center-screen"><section className="personal-signin"><UserRound size={40} /><h1>我的</h1><p>登录后管理个人资料、配置与互动记录。</p><button className="primary-button" type="button" onClick={onRequireAccount}>登录 / 注册</button></section></main>;

  const published = dashboard.data?.configurations ?? [];
  const stats = dashboard.data?.stats ?? { publishedCount: 0, recommendationsReceived: 0, commentsWritten: 0 };
  const configurationCount = stats.publishedCount + (savedDraft ? 1 : 0);
  const joined = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(new Date(user.createdAt));

  return <main className="personal-center-screen">
    <header className="personal-heading"><h1>我的</h1><p>管理个人资料、配置与互动记录。</p></header>
    <section className="profile-overview">
      <div className="profile-identity"><span className="profile-avatar" aria-hidden="true">{user.displayName.slice(0, 1)}</span><div><h2>{user.displayName}</h2><p>@{user.username}</p><p>{joined}加入{user.location ? <><i>·</i><MapPin size={14} />{user.location}</> : null}</p><span>{user.bio || "还没有填写个人简介。"}</span></div><button type="button" onClick={() => { setEditing(true); setTab("settings"); }}>编辑资料</button></div>
      <dl className="profile-stats"><div><dt>我的配置</dt><dd>{configurationCount}</dd></div><div><dt>已发布</dt><dd>{stats.publishedCount}</dd></div><div><dt>获得推荐</dt><dd>{stats.recommendationsReceived}</dd></div><div><dt>评论</dt><dd>{stats.commentsWritten}</dd></div></dl>
    </section>
    <div className="personal-tabs-row"><div className="personal-tabs" role="tablist" aria-label="个人中心内容"><TabButton id="configurations" current={tab} onSelect={setTab}>我的配置</TabButton><TabButton id="published" current={tab} onSelect={setTab}>已发布</TabButton><TabButton id="activity" current={tab} onSelect={setTab}>我的互动</TabButton><TabButton id="settings" current={tab} onSelect={setTab}>账户设置</TabButton></div>{tab !== "settings" ? <button className="primary-button personal-create" type="button" onClick={onCreate}><Plus size={18} />创建新配置</button> : null}</div>
    {tab === "configurations" || tab === "published" ? <ConfigurationList includeLocal={tab === "configurations"} savedDraft={savedDraft} localSummary={localSummary} published={published} onOpenDraft={onOpenDraft} onOpenPublished={onOpenPublished} /> : null}
    {tab === "activity" ? <ActivityList activities={dashboard.data?.activities ?? []} /> : null}
    {tab === "settings" ? <ProfileForm user={user} editing={editing} onEditing={setEditing} onSaved={(updated) => { queryClient.setQueryData(["current-user"], updated); }} /> : null}
  </main>;
}

function TabButton({ id, current, onSelect, children }: { id: Tab; current: Tab; onSelect: (tab: Tab) => void; children: string }) {
  return <button role="tab" aria-selected={current === id} className={current === id ? "active" : ""} type="button" onClick={() => onSelect(id)}>{children}</button>;
}

function ConfigurationList({ includeLocal, savedDraft, localSummary, published, onOpenDraft, onOpenPublished }: { includeLocal: boolean; savedDraft: BuildDraft | null; localSummary: ReturnType<typeof summarizeBuild> | undefined; published: Awaited<ReturnType<typeof getUserDashboard>>["configurations"]; onOpenDraft: () => void; onOpenPublished: () => void }) {
  const empty = (!includeLocal || !savedDraft) && published.length === 0;
  if (empty) return <section className="personal-empty"><PcCase size={35} /><h2>这里还没有配置</h2><p>创建或发布配置后，会集中显示在这里。</p></section>;
  return <section className="personal-configurations" aria-label="我的配置列表"><div className="personal-list-head"><span>配置名称</span><span>用途</span><span>配件进度</span><span>状态</span><span>最近更新</span><span>操作</span></div>
    {includeLocal && savedDraft && localSummary ? <div className="personal-config-row"><span className="personal-config-name"><i><PcCase size={22} /></i><strong>{savedDraft.name}</strong></span><span>{savedDraft.usage}</span><span>{localSummary.progress} / 8</span><span className={localSummary.progress === 8 ? "config-status completed" : "config-status editing"}>{localSummary.progress === 8 ? <CircleCheck size={17} /> : <Clock3 size={17} />}{localSummary.progress === 8 ? "已完成" : "编辑中"}</span><span>{formatRelative(savedDraft.updatedAt)}</span><button type="button" onClick={onOpenDraft}>{localSummary.progress === 8 ? "打开配置" : "继续配置"}</button></div> : null}
    {published.map((configuration) => <div className="personal-config-row" key={configuration.id}><span className="personal-config-name"><i><PcCase size={22} /></i><strong>{configuration.name}</strong></span><span>{configuration.configurationClass}</span><span>{configuration.summary.progress} / 8</span><span className="config-status published"><CircleCheck size={17} />已发布</span><span>{formatRelative(configuration.createdAt)}</span><button type="button" onClick={onOpenPublished}>查看方案</button></div>)}
  </section>;
}

function ActivityList({ activities }: { activities: Awaited<ReturnType<typeof getUserDashboard>>["activities"] }) {
  if (!activities.length) return <section className="personal-empty"><MessageSquare size={35} /><h2>还没有互动记录</h2><p>推荐或评论配置后，记录会显示在这里。</p></section>;
  return <section className="personal-activities">{activities.map((activity, index) => <article key={`${activity.type}-${activity.configurationKey}-${index}`}><span>{activity.type === "comment" ? <MessageSquare size={20} /> : activity.value === 1 ? <ThumbsUp size={20} /> : <ThumbsDown size={20} />}</span><div><strong>{activity.type === "comment" ? "发表了评论" : activity.value === 1 ? "推荐了一套配置" : "标记为不推荐"}</strong><p>{activity.content || activity.configurationKey}</p></div><time>{formatRelative(activity.occurredAt)}</time></article>)}</section>;
}

function ProfileForm({ user, editing, onEditing, onSaved }: { user: PublicUser; editing: boolean; onEditing: (value: boolean) => void; onSaved: (user: PublicUser) => void }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [location, setLocation] = useState(user.location);
  const mutation = useMutation({ mutationFn: updateCurrentUser, onSuccess: (updated) => { onSaved(updated); onEditing(false); } });
  const cancel = () => { setDisplayName(user.displayName); setBio(user.bio); setLocation(user.location); onEditing(false); };
  return <section className="profile-settings"><div><Settings size={24} /><span><h2>个人资料</h2><p>这些信息会显示在你的公开配置和评论旁。</p></span></div><form onSubmit={(event) => { event.preventDefault(); mutation.mutate({ displayName, bio, location }); }}><label>用户名<input value={user.username} disabled /></label><label>显示名称<input value={displayName} disabled={!editing} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={24} /></label><label>所在地（选填）<input value={location} disabled={!editing} onChange={(event) => setLocation(event.target.value)} maxLength={40} placeholder="例如：上海" /></label><label className="profile-bio">个人简介（选填）<textarea value={bio} disabled={!editing} onChange={(event) => setBio(event.target.value)} maxLength={120} placeholder="介绍你的装机偏好" /></label>{mutation.error ? <p className="form-error">{mutation.error instanceof ApiClientError ? mutation.error.message : "保存失败，请稍后重试。"}</p> : null}{mutation.isSuccess ? <p className="profile-success" role="status"><CircleCheck size={16} />资料已更新</p> : null}<div>{editing ? <><button type="button" onClick={cancel}>取消</button><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "保存中…" : "保存资料"}</button></> : <button className="primary-button" type="button" onClick={() => onEditing(true)}>编辑资料</button>}</div></form></section>;
}

function formatRelative(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))}小时前`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}天前`;
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(value));
}
