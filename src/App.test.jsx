import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("PC assembly demo flow", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts a new build from the setup form", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "办公" }));
    await user.clear(screen.getByLabelText("配置名称"));
    await user.type(screen.getByLabelText("配置名称"), "工作电脑");
    await user.click(screen.getByRole("button", { name: /开始选择配件/ }));

    expect(screen.getByRole("heading", { name: "选择CPU" })).toBeInTheDocument();
    expect(screen.getByText("办公")).toBeInTheDocument();
    expect(screen.getAllByText("0 / 8").length).toBeGreaterThan(0);
  });

  it("completes the demo build and opens the summary", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /继续上次的配置/ }));
    expect(screen.getByRole("heading", { name: "选择机箱" })).toBeInTheDocument();

    const caseRow = screen.getByRole("heading", { name: "乔思伯 D31 MESH" }).closest("article");
    await user.click(within(caseRow).getByRole("button", { name: "选择" }));
    expect(screen.getByRole("heading", { name: "选择散热" })).toBeInTheDocument();

    const coolerRow = screen
      .getByRole("heading", { name: "利民 Peerless Assassin 120" })
      .closest("article");
    await user.click(within(coolerRow).getByRole("button", { name: "选择" }));

    expect(screen.getAllByText("8 / 8").length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: /查看完整配置/ })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "我的游戏主机" })).toBeInTheDocument();
    expect(screen.getByText("当前没有发现兼容性问题")).toBeInTheDocument();
  });

  it("filters the product list by keyword", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /开始选择配件/ }));
    await user.type(screen.getByPlaceholderText("搜索品牌或型号"), "Intel");

    expect(screen.getByText("Intel 酷睿 i5-14600KF")).toBeInTheDocument();
    expect(screen.queryByText("AMD 锐龙 5 7600X")).not.toBeInTheDocument();
  });

  it("saves the current build and shows it in My Builds", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /继续上次的配置/ }));
    await user.click(screen.getByRole("button", { name: "保存配置" }));

    expect(screen.getByRole("status")).toHaveTextContent("配置已保存到当前浏览器");
    expect(window.localStorage.getItem("pc-assembly-demo-build-v1")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "我的配置" }));
    expect(screen.getByRole("heading", { name: "我的配置" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "我的游戏主机" })).toBeInTheDocument();
  });
});
