import type { BuildDraft, CategoryCode, Usage } from "@pc-assembly/domain";

export const DRAFT_STORAGE_KEY = "pc-assembly-build-draft";
export const DRAFT_SCHEMA_VERSION = 1;

export function createDraft(input?: Partial<Pick<BuildDraft, "name" | "budgetFen" | "usage">>): BuildDraft {
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    name: input?.name ?? "我的游戏主机",
    budgetFen: input?.budgetFen ?? 800_000,
    usage: input?.usage ?? "游戏",
    selectedPartIds: {},
    updatedAt: new Date().toISOString()
  };
}

export function readDraft(storage: Storage): { draft: BuildDraft; recoveryMessage?: string } {
  const raw = storage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return { draft: createDraft() };
  try {
    const parsed = JSON.parse(raw) as Partial<BuildDraft>;
    if (parsed.schemaVersion !== DRAFT_SCHEMA_VERSION || !parsed.selectedPartIds || typeof parsed.name !== "string") {
      return { draft: createDraft(), recoveryMessage: "检测到旧版草稿，原数据已保留。请重新开始一套配置。" };
    }
    return { draft: parsed as BuildDraft };
  } catch {
    return { draft: createDraft(), recoveryMessage: "草稿无法读取，原数据已保留。请重新开始一套配置。" };
  }
}

export function writeDraft(storage: Storage, draft: BuildDraft): void {
  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draft, schemaVersion: DRAFT_SCHEMA_VERSION, updatedAt: new Date().toISOString() }));
}

export function updateSelection(draft: BuildDraft, category: CategoryCode, partId: string): BuildDraft {
  return { ...draft, selectedPartIds: { ...draft.selectedPartIds, [category]: partId }, updatedAt: new Date().toISOString() };
}

export function updateSetup(draft: BuildDraft, input: { name: string; budgetFen: number; usage: Usage }): BuildDraft {
  return { ...draft, ...input, updatedAt: new Date().toISOString() };
}
