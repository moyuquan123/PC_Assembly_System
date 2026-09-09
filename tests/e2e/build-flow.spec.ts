import { expect, test } from "@playwright/test";

test("creates a compatible build and opens its server-backed share page", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "先定目标，再选配件" })).toBeVisible();

  await page.getByRole("button", { name: "办公" }).click();
  await page.getByRole("textbox", { name: "配置名称" }).fill("自动化验收主机");
  await page.getByRole("button", { name: "开始选择配件" }).click();

  await expect(page.getByRole("heading", { name: "选择CPU" })).toBeVisible();
  await page.getByRole("button", { name: "选择", exact: true }).nth(1).click();
  await expect(page.getByRole("button", { name: "不兼容" }).first()).toBeDisabled();

  for (let category = 1; category < 8; category += 1) {
    await page.getByRole("button", { name: "选择", exact: true }).first().click();
  }

  const mobileSummary = page.locator(".mobile-summary-button");
  if (await mobileSummary.isVisible()) {
    await mobileSummary.click();
  } else {
    await expect(page.getByText("所有已选配件均兼容，可以完成这套配置。")).toBeVisible();
    await page.getByRole("button", { name: "查看完整配置" }).first().click();
  }
  await expect(page.getByRole("dialog", { name: "自动化验收主机" })).toBeVisible();

  await page.getByRole("button", { name: "生成分享链接" }).click();
  const shareUrl = await page.getByRole("textbox", { name: "分享链接已生成" }).inputValue();
  expect(shareUrl).toMatch(/\/builds\/[A-Za-z0-9_-]+$/);

  await page.goto(new URL(shareUrl).pathname);
  await expect(page.getByRole("heading", { name: "自动化验收主机" })).toBeVisible();
  await expect(page.getByText("服务端兼容校验通过")).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("creates an account, publishes a plan, recommends it and comments", async ({ page }, testInfo) => {
  await page.goto("/recommend");
  await expect(page.getByRole("heading", { name: "配置方案" })).toBeVisible();

  const officialRow = page.getByRole("row", { name: /AMD 主流游戏配置/ });
  await officialRow.getByRole("button", { name: "采用配置" }).click();
  await expect(page.getByRole("heading", { name: "选择CPU" })).toBeVisible();
  await expect(page.getByText("配置库方案已导入，可继续调整配件")).toBeVisible();

  await page.getByRole("link", { name: "配置方案" }).click();
  await page.getByRole("button", { name: "上传我的配置" }).click();
  await expect(page.getByRole("dialog", { name: "登录账号" })).toBeVisible();
  await page.getByRole("tab", { name: "注册" }).click();
  const suffix = `${testInfo.project.name.replace(/\W/g, "_")}_${Date.now().toString().slice(-5)}`;
  const username = `qa_${suffix}`;
  const configurationName = `端到端测试配置-${suffix}`;
  const comment = `端到端评论-${suffix}：配置均衡，升级路径清晰。`;
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("显示名称").fill("验收用户");
  await page.getByLabel("密码").fill("E2ePassword123!");
  await page.getByRole("button", { name: "创建账号" }).click();
  await expect(page.getByRole("dialog", { name: "创建账号" })).toBeHidden();

  await page.getByRole("button", { name: "上传我的配置" }).click();
  await expect(page.getByRole("dialog", { name: "上传我的配置" })).toContainText("8 / 8");
  await expect(page.getByText("发布账号").locator("..")).toContainText("验收用户");
  await page.getByLabel("方案名称").fill(configurationName);
  await page.getByLabel("推荐理由（选填）").fill("用于验证用户配置投稿流程。" );
  await page.getByRole("button", { name: "检查并上传" }).click();

  await expect(page.getByText("配置已通过检查并发布")).toBeVisible();
  await page.getByRole("group", { name: "方案来源" }).getByRole("button", { name: "用户投稿" }).click();
  const communityRow = page.getByRole("row").filter({ hasText: configurationName }).first();
  await expect(communityRow).toBeVisible();
  await communityRow.getByRole("button", { name: "查看配置" }).click();
  await page.getByRole("button", { name: "推荐", exact: true }).click();
  await expect(page.getByRole("button", { name: "推荐", exact: true })).toHaveClass(/selected/);
  await page.getByLabel("发表评论").fill(comment);
  await page.getByRole("button", { name: "发表评论" }).click();
  await expect(page.getByText(comment)).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).first().click();

  await page.getByRole("link", { name: "我的" }).click();
  await expect(page.getByRole("heading", { name: "我的" })).toBeVisible();
  await expect(page.getByText(configurationName)).toBeVisible();
  await page.getByRole("button", { name: "编辑资料" }).click();
  await page.getByLabel("所在地（选填）").fill("上海");
  await page.getByLabel("个人简介（选填）").fill("关注稳定与升级空间");
  await page.getByRole("button", { name: "保存资料" }).click();
  await expect(page.getByText("资料已更新")).toBeVisible();
  await expect(page.getByText("关注稳定与升级空间").first()).toBeVisible();
});

test("filters individual parts by category and brand", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "配置总览" }).click();
  await expect(page).toHaveURL(/\/configurations$/);
  await expect(page.getByRole("heading", { name: "配置总览" })).toBeVisible();
  await expect(page.getByText(/配置授权数据源后自动更新|最近同步/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "处理器 CPU" })).toBeVisible();
  await page.getByRole("group", { name: "品牌筛选" }).getByRole("button", { name: "Intel" }).click();
  await expect(page.getByRole("row", { name: /酷睿 i5-14600KF/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /锐龙 5 7600X/ })).toHaveCount(0);

  await page.getByRole("navigation", { name: "配件类别" }).getByRole("button", { name: /显卡/ }).click();
  await expect(page.getByRole("heading", { name: "显卡", exact: true })).toBeVisible();
  await page.getByRole("group", { name: "品牌筛选" }).getByRole("button", { name: "蓝宝石" }).click();
  await expect(page.getByRole("row", { name: /RX 7800 XT 白金版/ })).toBeVisible();
  await page.getByRole("row", { name: /RX 7800 XT 白金版/ }).getByRole("button", { name: "查看详情" }).click();
  await expect(page.getByRole("dialog", { name: "RX 7800 XT 白金版" })).toBeVisible();
});
