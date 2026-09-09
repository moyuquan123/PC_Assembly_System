import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { categories, checkCompatibility, getPartsByIds, recommendBuilds, seedParts, summarizeBuild } from "@pc-assembly/domain";
import App from "./App";

function apiResponse(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(status >= 400 ? { requestId: "test", error: data } : { requestId: "test", data }), { status, headers: { "content-type": "application/json" } }));
}

function installApiMock() {
  const publishedConfigurations: unknown[] = [];
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/v1/categories") return apiResponse(categories);
    if (url === "/api/v1/parts") return apiResponse(seedParts);
    if (url === "/api/v1/events") return apiResponse({ accepted: true }, 201);
    if (url === "/api/v1/configurations" && (!init?.method || init.method === "GET")) return apiResponse(publishedConfigurations);
    if (url === "/api/v1/configurations" && init?.method === "POST") {
      const payload = JSON.parse(String(init.body));
      const parts = getPartsByIds(payload.selectedPartIds, seedParts);
      const usage = payload.configurationClass === "办公入门" ? "办公" : payload.configurationClass === "内容创作" ? "内容创作" : "游戏";
      const snapshot = { name: payload.name, budgetFen: Number.MAX_SAFE_INTEGER, usage: usage as "办公" | "内容创作" | "游戏", parts };
      const published = { id: "00000000-0000-4000-8000-000000000002", ...payload, anonymousId: undefined, parts, checks: checkCompatibility(snapshot), summary: summarizeBuild(snapshot), createdAt: new Date().toISOString() };
      publishedConfigurations.unshift(published);
      return apiResponse(published, 201);
    }
    if (url === "/api/v1/recommendations" && init?.method === "POST") {
      const payload = JSON.parse(String(init.body));
      return apiResponse({ recommendationVersion: "test", ruleVersion: "test", recommendations: recommendBuilds(seedParts, payload) });
    }
    if (url === "/api/v1/builds" && init?.method === "POST") {
      const payload = JSON.parse(String(init.body));
      const parts = getPartsByIds(payload.selectedPartIds, seedParts);
      const snapshot = { name: payload.name, budgetFen: payload.budgetFen, usage: payload.usage, parts };
      return apiResponse({ id: "00000000-0000-4000-8000-000000000001", ...payload, parts, checks: checkCompatibility(snapshot), summary: summarizeBuild(snapshot), createdAt: new Date().toISOString(), ruleVersion: "test", shareCode: "abcdefghijklmnop", sharePath: "/builds/abcdefghijklmnop" }, 201);
    }
    return apiResponse({ code: "NOT_FOUND", message: url }, 404);
  }));
}

function renderApp(route = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><App /></MemoryRouter></QueryClientProvider>);
}

describe("PC assembly product flow", () => {
  beforeEach(() => { window.localStorage.clear(); vi.restoreAllMocks(); installApiMock(); });

  it("starts a new build and filters API-backed parts", async () => {
    const user = userEvent.setup(); renderApp();
    await user.click(screen.getByRole("button", { name: "办公" }));
    await user.clear(screen.getByLabelText("配置名称")); await user.type(screen.getByLabelText("配置名称"), "工作电脑");
    await user.click(screen.getByRole("button", { name: /开始选择配件/ }));
    expect(await screen.findByRole("heading", { name: "选择CPU" })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("搜索品牌或型号"), "Intel");
    expect(screen.getByText("Intel 酷睿 i5-14600KF")).toBeInTheDocument();
    expect(screen.queryByText("AMD 锐龙 5 7600X")).not.toBeInTheDocument();
  });

  it("blocks an incompatible candidate and advances after a compatible choice", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("pc-assembly-build-draft", JSON.stringify({ schemaVersion: 1, name: "测试", budgetFen: 800000, usage: "游戏", selectedPartIds: { cpu: "cpu-7600x" }, updatedAt: new Date().toISOString() }));
    renderApp("/builder");
    expect(await screen.findByRole("heading", { name: "选择主板" })).toBeInTheDocument();
    const incompatible = screen.getByRole("heading", { name: "技嘉 B760M AORUS ELITE AX" }).closest("article")!;
    expect(within(incompatible).getByRole("button", { name: "不兼容" })).toBeDisabled();
    const compatible = screen.getByRole("heading", { name: "华硕 TUF GAMING B650M-PLUS" }).closest("article")!;
    await user.click(within(compatible).getByRole("button", { name: "选择" }));
    expect(screen.getByRole("heading", { name: "选择显卡" })).toBeInTheDocument();
  });

  it("browses individual parts by category and brand", async () => {
    const user = userEvent.setup();
    renderApp("/configurations");

    expect(await screen.findByRole("heading", { name: "配置总览" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "处理器 CPU" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("group", { name: "品牌筛选" })).getByRole("button", { name: "Intel" }));
    expect(screen.getByText("酷睿 i5-14600KF")).toBeInTheDocument();
    expect(screen.queryByText("锐龙 5 7600X")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /显卡/ }));
    expect(screen.getByRole("heading", { name: "显卡" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "品牌筛选" })).getByRole("button", { name: "华硕" })).toBeInTheDocument();
  });

  it("saves a versioned local draft and shows it under My Builds", async () => {
    const user = userEvent.setup(); renderApp();
    await user.click(screen.getByRole("button", { name: /开始选择配件/ }));
    await screen.findByRole("heading", { name: "选择CPU" });
    await user.click(screen.getByRole("button", { name: "保存配置" }));
    expect(screen.getByRole("status")).toHaveTextContent("配置已保存到当前浏览器");
    expect(JSON.parse(window.localStorage.getItem("pc-assembly-build-draft")!).schemaVersion).toBe(1);
    await user.click(screen.getByRole("link", { name: "我的配置" }));
    expect(screen.getByRole("heading", { name: "我的游戏主机" })).toBeInTheDocument();
  });

  it("generates a server-backed share link for a complete compatible build", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("pc-assembly-build-draft", JSON.stringify({ schemaVersion: 1, name: "完整配置", budgetFen: 900000, usage: "游戏", selectedPartIds: { cpu: "cpu-7600x", motherboard: "mb-b650", gpu: "gpu-4060ti", memory: "ram-fury", storage: "ssd-tiplus", psu: "psu-g7", case: "case-air100", cooler: "cooler-pa120" }, updatedAt: new Date().toISOString() }));
    renderApp("/builder"); await screen.findAllByText("8 / 8");
    await user.click(screen.getAllByRole("button", { name: /查看完整配置/ })[0]!);
    await user.click(screen.getByRole("button", { name: /生成分享链接/ }));
    await waitFor(() => expect((screen.getByLabelText("分享链接已生成") as HTMLInputElement).value).toContain("/builds/abcdefghijklmnop"));
  });

  it("uploads a complete user configuration and shows it in configuration plans", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("pc-assembly-build-draft", JSON.stringify({ schemaVersion: 1, name: "完整配置", budgetFen: 900000, usage: "游戏", selectedPartIds: { cpu: "cpu-7600x", motherboard: "mb-b650", gpu: "gpu-4060ti", memory: "ram-fury", storage: "ssd-tiplus", psu: "psu-g7", case: "case-air100", cooler: "cooler-pa120" }, updatedAt: new Date().toISOString() }));
    renderApp("/recommend");

    expect(await screen.findByRole("heading", { name: "配置方案" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "上传我的配置" }));
    expect(screen.getByRole("dialog", { name: "上传我的配置" })).toHaveTextContent("8 / 8");
    await user.type(screen.getByLabelText("你的称呼"), "小明");
    await user.clear(screen.getByLabelText("方案名称"));
    await user.type(screen.getByLabelText("方案名称"), "我的 2K 游戏主机");
    await user.type(screen.getByLabelText("推荐理由（选填）"), "适合主流 2K 游戏。" );
    await user.click(screen.getByRole("button", { name: "检查并上传" }));

    expect(await screen.findByText("我的 2K 游戏主机")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("配置已通过检查并发布");
    await user.click(within(screen.getByRole("group", { name: "方案来源" })).getByRole("button", { name: "用户投稿" }));
    expect(screen.getByRole("heading", { name: "共 1 套方案" })).toBeInTheDocument();
  });
});
