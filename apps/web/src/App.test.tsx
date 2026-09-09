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
  let currentUser: { id: string; username: string; displayName: string; bio: string; location: string; createdAt: string } | undefined;
  const engagement = { configurationKey: "official:amd-office-entry", recommendCount: 0, notRecommendCount: 0, commentCount: 0, impressionCount: 0, clickCount: 0, clickRate: 0, hybridScore: 20, myVote: 0 };
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/v1/categories") return apiResponse(categories);
    if (url === "/api/v1/parts") return apiResponse(seedParts);
    if (url === "/api/v1/catalog/freshness") return apiResponse({ sourceCode: "taobao", sourceName: "淘宝开放平台", mode: "local", status: "disabled", updatedParts: 0, candidateCount: 0, message: "当前展示本地目录。" });
    if (url === "/api/v1/events") return apiResponse({ accepted: true }, 201);
    if (url === "/api/v1/users/me" && init?.method === "PATCH") {
      const payload = JSON.parse(String(init.body)); currentUser = { ...currentUser!, ...payload }; return apiResponse(currentUser);
    }
    if (url === "/api/v1/users/me") return currentUser ? apiResponse(currentUser) : apiResponse({ code: "USER_AUTH_REQUIRED", message: "请先登录" }, 401);
    if (url === "/api/v1/users/me/dashboard") return currentUser ? apiResponse({ stats: { publishedCount: publishedConfigurations.length, recommendationsReceived: 0, commentsWritten: 0 }, configurations: publishedConfigurations, activities: [] }) : apiResponse({ code: "USER_AUTH_REQUIRED", message: "请先登录" }, 401);
    if (url === "/api/v1/users" && init?.method === "POST") {
      const payload = JSON.parse(String(init.body));
      currentUser = { id: "00000000-0000-4000-8000-000000000010", username: payload.username, displayName: payload.displayName, bio: "", location: "", createdAt: new Date().toISOString() };
      return apiResponse(currentUser, 201);
    }
    if (url === "/api/v1/user-sessions" && init?.method === "POST") return currentUser ? apiResponse(currentUser) : apiResponse({ code: "USER_CREDENTIALS_INVALID", message: "用户名或密码不正确" }, 401);
    if (url === "/api/v1/user-sessions/current" && init?.method === "DELETE") { currentUser = undefined; return apiResponse({ loggedOut: true }); }
    if (url.startsWith("/api/v1/configuration-engagement?")) return apiResponse([
      { ...engagement, configurationKey: "official:amd-office-entry" },
      ...["intel-office-entry", "amd-mainstream-gaming", "intel-mainstream-gaming", "amd-high-end-gaming", "intel-high-end-gaming", "amd-content-creation", "intel-content-creation"].map((id) => ({ ...engagement, configurationKey: `official:${id}` }))
    ]);
    if (url === "/api/v1/configuration-impressions" && init?.method === "POST") return apiResponse({ accepted: 8 }, 201);
    if (url.endsWith("/click") && init?.method === "POST") return apiResponse({ accepted: true }, 201);
    if (url.endsWith("/vote") && init?.method === "POST") return apiResponse({ ...engagement, myVote: JSON.parse(String(init.body)).value });
    if (url.endsWith("/comments") && (!init?.method || init.method === "GET")) return apiResponse([]);
    if (url.endsWith("/comments") && init?.method === "POST") return apiResponse({ id: "comment-1", configurationKey: "official:amd-office-entry", author: currentUser, content: JSON.parse(String(init.body)).content, createdAt: new Date().toISOString() }, 201);
    if (url === "/api/v1/configurations" && (!init?.method || init.method === "GET")) return apiResponse(publishedConfigurations);
    if (url === "/api/v1/configurations" && init?.method === "POST") {
      const payload = JSON.parse(String(init.body));
      const parts = getPartsByIds(payload.selectedPartIds, seedParts);
      const usage = payload.configurationClass === "办公入门" ? "办公" : payload.configurationClass === "内容创作" ? "内容创作" : "游戏";
      const snapshot = { name: payload.name, budgetFen: Number.MAX_SAFE_INTEGER, usage: usage as "办公" | "内容创作" | "游戏", parts };
      const published = { id: "00000000-0000-4000-8000-000000000002", ...payload, authorName: currentUser?.displayName ?? "用户", parts, checks: checkCompatibility(snapshot), summary: summarizeBuild(snapshot), createdAt: new Date().toISOString() };
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

  it("saves a versioned local draft and shows it in the personal center", async () => {
    const user = userEvent.setup(); renderApp();
    await user.click(screen.getByRole("button", { name: /开始选择配件/ }));
    await screen.findByRole("heading", { name: "选择CPU" });
    await user.click(screen.getByRole("button", { name: "保存配置" }));
    expect(screen.getByRole("status")).toHaveTextContent("配置已保存到当前浏览器");
    expect(JSON.parse(window.localStorage.getItem("pc-assembly-build-draft")!).schemaVersion).toBe(1);
    await user.click(screen.getByRole("link", { name: "我的" }));
    await user.click(within(screen.getByRole("main")).getByRole("button", { name: "登录 / 注册" }));
    await user.click(screen.getByRole("tab", { name: "注册" }));
    await user.type(screen.getByLabelText("用户名"), "saved_user");
    await user.type(screen.getByLabelText("显示名称"), "保存用户");
    await user.type(screen.getByLabelText("密码"), "Password123!");
    await user.click(screen.getByRole("button", { name: "创建账号" }));
    expect(screen.getByText("我的游戏主机")).toBeInTheDocument();
  });

  it("updates normal profile information from My", async () => {
    const user = userEvent.setup(); renderApp("/me");
    await user.click(within(screen.getByRole("main")).getByRole("button", { name: "登录 / 注册" }));
    await user.click(screen.getByRole("tab", { name: "注册" }));
    await user.type(screen.getByLabelText("用户名"), "profile_user");
    await user.type(screen.getByLabelText("显示名称"), "资料用户");
    await user.type(screen.getByLabelText("密码"), "Password123!");
    await user.click(screen.getByRole("button", { name: "创建账号" }));
    await user.click(screen.getByRole("button", { name: "编辑资料" }));
    await user.type(screen.getByLabelText("所在地（选填）"), "上海");
    await user.type(screen.getByLabelText("个人简介（选填）"), "热爱电脑硬件");
    await user.click(screen.getByRole("button", { name: "保存资料" }));
    expect(await screen.findByText("资料已更新")).toBeInTheDocument();
    expect((await screen.findAllByText("热爱电脑硬件")).length).toBeGreaterThanOrEqual(1);
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
    expect(screen.getByRole("dialog", { name: "登录账号" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "注册" }));
    await user.type(screen.getByLabelText("用户名"), "xiaoming");
    await user.type(screen.getByLabelText("显示名称"), "小明");
    await user.type(screen.getByLabelText("密码"), "Password123!");
    await user.click(screen.getByRole("button", { name: "创建账号" }));
    await user.click(screen.getByRole("button", { name: "上传我的配置" }));
    expect(screen.getByRole("dialog", { name: "上传我的配置" })).toHaveTextContent("8 / 8");
    expect(screen.getByText("发布账号").parentElement).toHaveTextContent("小明");
    await user.clear(screen.getByLabelText("方案名称"));
    await user.type(screen.getByLabelText("方案名称"), "我的 2K 游戏主机");
    await user.type(screen.getByLabelText("推荐理由（选填）"), "适合主流 2K 游戏。" );
    await user.click(screen.getByRole("button", { name: "检查并上传" }));

    expect(await screen.findByText("我的 2K 游戏主机")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("配置已通过检查并发布");
    await user.click(within(screen.getByRole("group", { name: "方案来源" })).getByRole("button", { name: "用户投稿" }));
    expect(screen.getByRole("heading", { name: "共 1 套方案" })).toBeInTheDocument();
  });

  it("opens configuration details and requires an account before voting", async () => {
    const user = userEvent.setup();
    renderApp("/recommend");
    expect(await screen.findByRole("heading", { name: "配置方案" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "查看配置" })[0]!);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/click$/), expect.objectContaining({ method: "POST", headers: expect.any(Headers) })));
    const clickCall = vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith("/click"));
    expect((clickCall?.[1]?.headers as Headers).has("content-type")).toBe(false);
    expect(screen.getByRole("dialog", { name: "Intel 入门办公配置" })).toHaveTextContent("社区互动");
    await user.click(screen.getByRole("button", { name: "推荐" }));
    expect(screen.getByRole("dialog", { name: "登录账号" })).toHaveTextContent("登录后可发布配置、评论与推荐");
  });
});
