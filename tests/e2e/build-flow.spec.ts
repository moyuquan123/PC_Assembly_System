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

test("generates a smart recommendation and imports it into the builder", async ({ page }) => {
  await page.goto("/recommend");
  await expect(page.getByRole("heading", { name: "告诉我们目标，获得三套可靠配置" })).toBeVisible();

  await page.getByLabel("整机预算").fill("9000");
  await page.getByRole("button", { name: "内容创作" }).click();
  await page.getByRole("button", { name: "生成三套推荐" }).click();

  await expect(page.getByRole("heading", { name: "均衡方案" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "性能优先" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "性价比优先" })).toBeVisible();
  await page.getByRole("button", { name: "采用并继续调整" }).first().click();

  await expect(page.getByRole("heading", { name: "选择CPU" })).toBeVisible();
  await expect(page.getByText("推荐配置已导入，可继续调整配件")).toBeVisible();
  const importedMobileSummary = page.locator(".mobile-summary-button");
  if (await importedMobileSummary.isVisible()) {
    await importedMobileSummary.click();
    await expect(page.getByRole("dialog", { name: "均衡方案 · 内容创作主机" })).toBeVisible();
    await expect(page.locator(".modal-build-row:not(.missing)")).toHaveCount(8);
  } else {
    await expect(page.getByText("8 / 8").first()).toBeVisible();
  }
});

test("filters the configuration library and adopts a complete build", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "配置总览" }).click();
  await expect(page).toHaveURL(/\/configurations$/);
  await expect(page.getByRole("heading", { name: "配置总览" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "共 8 套方案" })).toBeVisible();

  await page.getByRole("group", { name: "品牌平台" }).getByRole("button", { name: "Intel" }).click();
  await page.getByRole("group", { name: "配置分类" }).getByRole("button", { name: "主流游戏" }).click();
  await expect(page.getByRole("heading", { name: "共 1 套方案" })).toBeVisible();
  const row = page.getByRole("row", { name: /Intel 主流游戏配置/ });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "查看配置" }).click();
  await expect(page.getByRole("dialog", { name: "Intel 主流游戏配置" })).toBeVisible();
  await page.getByRole("button", { name: "采用此配置" }).click();

  await expect(page.getByRole("heading", { name: "选择CPU" })).toBeVisible();
  await expect(page.getByText("配置库方案已导入，可继续调整配件")).toBeVisible();
  const progress = page.locator(".progress-summary");
  if (await progress.isVisible()) {
    await expect(progress).toContainText("8 / 8");
  } else {
    await page.locator(".mobile-summary-button").click();
    await expect(page.getByRole("dialog", { name: "Intel 主流游戏配置" })).toBeVisible();
    await expect(page.locator(".modal-build-row:not(.missing)")).toHaveCount(8);
  }
});
