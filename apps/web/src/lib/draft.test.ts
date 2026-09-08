import { describe, expect, it } from "vitest";
import { createDraft, DRAFT_STORAGE_KEY, readDraft, updateSelection, writeDraft } from "./draft";

describe("versioned local draft", () => {
  it("round-trips a current schema draft", () => {
    const storage = window.localStorage;
    storage.clear();
    const draft = updateSelection(createDraft(), "cpu", "cpu-7600x");
    writeDraft(storage, draft);
    expect(readDraft(storage).draft.selectedPartIds.cpu).toBe("cpu-7600x");
  });

  it("preserves unsupported raw data and asks the user to restart", () => {
    const storage = window.localStorage;
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ schemaVersion: 99, selectedPartIds: { cpu: "legacy" }, name: "旧数据" }));
    const recovered = readDraft(storage);
    expect(recovered.recoveryMessage).toContain("原数据已保留");
    expect(storage.getItem(DRAFT_STORAGE_KEY)).toContain("legacy");
    expect(recovered.draft.schemaVersion).toBe(1);
  });
});
