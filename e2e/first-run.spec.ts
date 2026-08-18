import { expect, test } from "@playwright/test";

test("clean profile first-run wizard, manager login, and reload keep shop config", async ({ page }) => {
  const shop = "Quán Nhà E2E";
  const manager = "Chủ quán E2E";
  const pin = "5821";

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Thiết lập quán" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toHaveCount(0);
  await expect(page.getByText("Quán Demo")).toHaveCount(0);
  await expect(page.getByText("0000")).toHaveCount(0);
  await expect(page.getByText("1111")).toHaveCount(0);

  const overflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(overflow.html).toBeLessThanOrEqual(0);
  expect(overflow.body).toBeLessThanOrEqual(0);

  await page.getByLabel("Tên quán").fill(shop);
  await page.getByLabel("Số bàn").fill("3");
  await page.getByLabel("Tên quản lý").fill(manager);
  await page.getByLabel("PIN 4 số").fill(pin);
  await page.getByLabel("Thêm menu mẫu").check();
  await page.getByRole("button", { name: "Tạo quán" }).click();

  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(shop)).toBeVisible();
  await expect(page.getByText("Quán Demo")).toHaveCount(0);
  await expect(page.locator("select option", { hasText: manager })).toBeAttached();

  await page.getByLabel("Chọn nhân viên").selectOption({ label: manager });
  await page.getByLabel("PIN").fill(pin);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: "CafePOS" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Bàn 1/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Bàn 3/i }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(shop)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thiết lập quán" })).toHaveCount(0);
  await expect(page.getByText("0000")).toHaveCount(0);
  await page.getByLabel("Chọn nhân viên").selectOption({ label: manager });
  await page.getByLabel("PIN").fill(pin);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: "CafePOS" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Bàn 1/i }).first()).toBeVisible();
});
