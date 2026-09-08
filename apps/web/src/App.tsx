import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { categories, getPartsByIds } from "@pc-assembly/domain";
import type { AnalyticsEventInput } from "@pc-assembly/contracts";
import type { BuildDraft, CategoryCode, Part } from "@pc-assembly/domain";
import AdminLoginScreen from "./components/AdminLoginScreen";
import AdminPartsScreen from "./components/AdminPartsScreen";
import AppHeader from "./components/AppHeader";
import BuilderScreen from "./components/BuilderScreen";
import SavedScreen from "./components/SavedScreen";
import SetupScreen from "./components/SetupScreen";
import SharedBuildScreen from "./components/SharedBuildScreen";
import { ApiClientError, createAdminPart, createSharedBuild, getAdminParts, getCategories, getParts, getSharedBuild, loginAdmin, sendEvent, updateAdminPart } from "./lib/api";
import { createDraft, DRAFT_STORAGE_KEY, readDraft, updateSelection, updateSetup, writeDraft } from "./lib/draft";
import { formatYuan } from "./lib/format";

const anonymousIdKey = "pc-assembly-anonymous-id";

function getAnonymousId(): string {
  const existing = window.localStorage.getItem(anonymousIdKey);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(anonymousIdKey, id);
  return id;
}

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : error instanceof Error ? error.message : "服务暂时不可用。";
}

export default function App() {
  const navigate = useNavigate();
  const initial = useMemo(() => readDraft(window.localStorage), []);
  const [draft, setDraft] = useState<BuildDraft>(initial.draft);
  const [savedDraft, setSavedDraft] = useState<BuildDraft | null>(() => window.localStorage.getItem(DRAFT_STORAGE_KEY) && !initial.recoveryMessage ? initial.draft : null);
  const [toast, setToast] = useState(initial.recoveryMessage ?? "");
  const partsQuery = useQuery({ queryKey: ["parts"], queryFn: () => getParts() });
  useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const parts = partsQuery.data ?? [];

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const persist = (next: BuildDraft, message?: string) => {
    setDraft(next); writeDraft(window.localStorage, next); setSavedDraft(next);
    if (message) showToast(message);
  };
  const start = (setup: Pick<BuildDraft, "name" | "budgetFen" | "usage">) => {
    const next = updateSetup(createDraft(), setup); persist(next);
    track({ eventName: "build_started", properties: { usage: next.usage, budgetRange: budgetRange(next.budgetFen) } });
    navigate("/builder");
  };
  const choose = (category: CategoryCode, partId: string) => {
    const next = updateSelection(draft, category, partId); persist(next);
    track({ eventName: "part_selected", properties: { category, step: categories.findIndex((item) => item.code === category) + 1 } });
  };
  const copyBuild = async () => {
    const selected = getPartsByIds(draft.selectedPartIds, parts);
    const lines = [draft.name, ...selected.map((part) => `${part.name}  ${formatYuan(part.priceFen)}`), `预算：${formatYuan(draft.budgetFen)}`];
    await navigator.clipboard.writeText(lines.join("\n")); showToast("配置单已复制");
  };
  const shareBuild = async () => {
    const response = await createSharedBuild({ name: draft.name, budgetFen: draft.budgetFen, usage: draft.usage, selectedPartIds: draft.selectedPartIds });
    const url = new URL(response.sharePath!, window.location.origin).toString();
    track({ eventName: "build_shared", properties: { progress: response.summary.progress, hasWarning: response.checks.some((item) => item.level === "warning") } });
    return url;
  };
  const saveCurrent = () => { persist(draft, "配置已保存到当前浏览器"); track({ eventName: "build_saved_local", properties: { progress: Object.keys(draft.selectedPartIds).length } }); };

  return <div className="app-shell"><AppHeader onSave={saveCurrent} />
    <Routes>
      <Route path="/" element={<SetupScreen draft={draft} hasSavedDraft={Boolean(savedDraft)} onStart={start} onContinue={() => { if (savedDraft) setDraft(savedDraft); navigate("/builder"); }} />} />
      <Route path="/builder" element={<BuilderScreen draft={draft} parts={parts} loading={partsQuery.isLoading} error={partsQuery.error ? errorMessage(partsQuery.error) : ""} onChoose={choose} onEditSetup={() => navigate("/")} onCopy={copyBuild} onShare={shareBuild} />} />
      <Route path="/saved" element={<SavedScreen savedDraft={savedDraft} parts={parts} onOpen={() => { if (savedDraft) setDraft(savedDraft); navigate("/builder"); }} onStart={() => navigate("/")} />} />
      <Route path="/builds/:shareCode" element={<SharedRoute />} />
      <Route path="/admin/login" element={<AdminLoginScreen onLogin={async (username, password) => { await loginAdmin(username, password); navigate("/admin/parts"); }} />} />
      <Route path="/admin/parts" element={<AdminRoute />} />
      <Route path="/admin/parts/:id" element={<AdminRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <div className={toast ? "toast visible" : "toast"} role="status">{toast}</div>
  </div>;
}

function SharedRoute() {
  const { shareCode = "" } = useParams();
  const query = useQuery({ queryKey: ["shared-build", shareCode], queryFn: () => getSharedBuild(shareCode), enabled: Boolean(shareCode), retry: false });
  return <SharedBuildScreen build={query.data} loading={query.isLoading} error={query.error ? errorMessage(query.error) : ""} />;
}

function AdminRoute() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin-parts"], queryFn: getAdminParts, retry: false });
  if (query.error instanceof ApiClientError && query.error.status === 401) return <Navigate to="/admin/login" replace />;
  const save = async (part: Omit<Part, "updatedAt">, isNew: boolean) => {
    if (isNew) await createAdminPart(part); else await updateAdminPart(part.id, part);
    await queryClient.invalidateQueries({ queryKey: ["admin-parts"] });
    await queryClient.invalidateQueries({ queryKey: ["parts"] });
  };
  return <AdminPartsScreen parts={query.data ?? []} loading={query.isLoading} error={query.error ? errorMessage(query.error) : ""} onSave={save} />;
}

function budgetRange(budgetFen: number): string {
  const yuan = budgetFen / 100;
  if (yuan < 5000) return "under-5000";
  if (yuan < 10000) return "5000-9999";
  return "10000-plus";
}

function track(event: Omit<AnalyticsEventInput, "anonymousId">): void {
  sendEvent({ ...event, anonymousId: getAnonymousId() } as AnalyticsEventInput);
}
