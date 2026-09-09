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
  await expect(page.getByRole("heading", { name: "配置总览" })).toBeVisible();
  await expect(page.getByText("自动化验收主机 · 已完成 0 / 8")).toBeVisible();
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
  await expect(page.getByText("均衡方案 · 内容创作主机 · 已完成 8 / 8")).toBeVisible();
  await expect(page.getByRole("button", { name: /查看CPU：/ })).toBeVisible();
  const importedMobileSummary = page.locator(".mobile-summary-button");
  if (await importedMobileSummary.isVisible()) {
    await importedMobileSummary.click();
    await expect(page.getByRole("dialog", { name: "均衡方案 · 内容创作主机" })).toBeVisible();
    await expect(page.locator(".modal-build-row:not(.missing)")).toHaveCount(8);
  } else {
    await expect(page.getByText("8 / 8").first()).toBeVisible();
  }
});
