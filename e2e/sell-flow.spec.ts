import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const SCREENSHOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../test-results/e2e-screenshots");

async function setupAndLogin(page: Page) {
  const shop = "Quán Bán E2E";
  const manager = "Chủ bán E2E";
  const pin = "5821";

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Thiết lập quán" })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Tên quán").fill(shop);
  await page.getByLabel("Số bàn").fill("2");
  await page.getByLabel("Tên quản lý").fill(manager);
  await page.getByLabel("PIN 4 số").fill(pin);
  await page.getByLabel("Thêm menu mẫu").check();
  await page.getByRole("button", { name: "Tạo quán" }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Chọn nhân viên").selectOption({ label: manager });
  await page.getByLabel("PIN").fill(pin);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: "CafePOS" })).toBeVisible({ timeout: 15_000 });
  return { manager, pin };
}

async function login(page: Page, manager: string, pin: string) {
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Chọn nhân viên").selectOption({ label: manager });
  await page.getByLabel("PIN").fill(pin);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: "CafePOS" })).toBeVisible({ timeout: 15_000 });
}

async function clickTabIfVisible(page: Page, name: RegExp) {
  const tab = page.getByRole("tab", { name });
  if (await tab.count() && await tab.first().isVisible()) {
    await tab.first().click();
  }
}

function visibleButton(page: Page, name: string | RegExp) {
  return page.getByRole("button", { name }).filter({ visible: true });
}

test("first-run sell: open table, add, reload, send kitchen, pay, receipt, release", async ({ page }, testInfo) => {
  const { manager, pin } = await setupAndLogin(page);

  await clickTabIfVisible(page, /^Bàn/);
  const emptyTable = visibleButton(page, /Bàn 1/);
  await expect(emptyTable).toBeVisible();
  await expect(emptyTable).toContainText("Trống");
  await emptyTable.click();
  await expect(visibleButton(page, /Bàn 1/)).toContainText("Có khách");

  await clickTabIfVisible(page, /^Thực đơn/);
  await visibleButton(page, "+ Cà phê đen").click();

  await clickTabIfVisible(page, /^Đơn/);
  const orderLine = page.locator('[class*="rounded-xl"]', { hasText: "Cà phê đen" }).filter({ visible: true });
  await expect(orderLine).toBeVisible();
  await expect(orderLine.locator("span.font-semibold")).toHaveText("1");

  await page.reload();
  await login(page, manager, pin);
  await clickTabIfVisible(page, /^Bàn/);
  const occupied = visibleButton(page, /Bàn 1/);
  await expect(occupied).toContainText("Có khách");
  await occupied.click();
  await clickTabIfVisible(page, /^Đơn/);
  await expect(page.locator('[class*="rounded-xl"]', { hasText: "Cà phê đen" }).filter({ visible: true })).toBeVisible();

  const send = visibleButton(page, /Gửi bếp/);
  await expect(send).toBeEnabled();
  await send.click();
  await expect(send).toBeDisabled();
  await expect(visibleButton(page, /Thanh toán/)).toBeEnabled();

  await page.reload();
  await login(page, manager, pin);
  await clickTabIfVisible(page, /^Bàn/);
  await expect(visibleButton(page, /Bàn 1/)).toContainText("Có khách");
  await visibleButton(page, /Bàn 1/).click();
  await clickTabIfVisible(page, /^Đơn/);
  await expect(page.locator('[class*="rounded-xl"]', { hasText: "Cà phê đen" }).filter({ visible: true })).toBeVisible();
  await expect(visibleButton(page, /Gửi bếp/)).toBeDisabled();
  const checkout = visibleButton(page, /Thanh toán/);
  await expect(checkout).toBeEnabled();
  await checkout.click();
  const modalOverflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(modalOverflow.html).toBeLessThanOrEqual(0);
  expect(modalOverflow.body).toBeLessThanOrEqual(0);
  await page.getByLabel("Số tiền khách đưa").fill("25000");
  await page.getByRole("button", { name: "Xác nhận thanh toán" }).click();
  await expect(page.getByRole("region", { name: "Hóa đơn thanh toán" })).toBeVisible();
  const receiptOverflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(receiptOverflow.html).toBeLessThanOrEqual(0);
  expect(receiptOverflow.body).toBeLessThanOrEqual(0);

  await expect(page.getByText(/Thanh toán thành công/)).toBeVisible();

  const shot = path.join(SCREENSHOT_DIR, `sell-flow-${testInfo.project.name}.png`);
  await page.screenshot({ path: shot, fullPage: false });

  await page.getByRole("button", { name: "Đóng" }).click();
  await expect(page.getByRole("dialog", { name: "Thanh toán" })).toHaveCount(0);
  await clickTabIfVisible(page, /^Bàn/);
  await expect(visibleButton(page, /Bàn 1/)).toContainText("Trống");

  const overflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(overflow.html).toBeLessThanOrEqual(0);
  expect(overflow.body).toBeLessThanOrEqual(0);
});
