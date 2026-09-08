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
