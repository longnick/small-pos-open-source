import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.resolve(__dirname, "../docs/ai-map/TASK_LOGS");

/** Tailwind `lg` is 1024px. Desktop shell uses 3 columns; tablet keeps tabs. */
const DESKTOP_MIN_WIDTH = 1024;

function tagFor(viewport: { width: number; height: number }): string {
  return `${viewport.width}x${viewport.height}`;
}

function isDesktopWidth(width: number): boolean {
  return width >= DESKTOP_MIN_WIDTH;
}

async function signIn(page: Page) {
  await page.goto("/");
  await page
    .locator('select[aria-label="Chọn nhân viên"]')
    .selectOption({ label: "Fixture Manager" });
  await page.locator('input[type="password"]').fill("2468");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(
    page.getByRole("heading", { name: "CafePOS", exact: true }),
  ).toBeVisible();
}

async function openMenu(page: Page, width: number) {
  if (!isDesktopWidth(width)) {
    await page.getByRole("tab", { name: /^Thực đơn/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Thực đơn" })).toBeVisible();
}

async function openOrder(page: Page, width: number) {
  if (!isDesktopWidth(width)) {
    await page.getByRole("tab", { name: /^Đơn/ }).click();
  }
}

function visibleMain(page: Page) {
  return page.locator("main:visible");
}

function orderLine(page: Page, itemName: string) {
  return visibleMain(page).locator("li", { hasText: itemName });
}

async function assertNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      htmlOk: html.scrollWidth <= html.clientWidth,
      bodyOk: body.scrollWidth <= body.clientWidth,
    };
  });
  expect(overflow.htmlOk).toBe(true);
  expect(overflow.bodyOk).toBe(true);
}

async function assertBoxFitsViewport(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  viewport: { width: number; height: number },
) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function occupyTableOne(
  page: Page,
  viewport: { width: number; height: number },
) {
  const ban1Button = page.getByRole("button", { name: /Bàn 1/ });
  await expect(ban1Button).toBeVisible();
  await expect(ban1Button).toContainText("Trống");
  await assertBoxFitsViewport(page, ban1Button, viewport);
  await ban1Button.click();
  await expect(ban1Button).toContainText("Có khách");
  await assertBoxFitsViewport(page, ban1Button, viewport);
  return ban1Button;
}

async function seedOrder(
  page: Page,
  viewport: { width: number; height: number },
) {
  await signIn(page);
  await occupyTableOne(page, viewport);

  await openMenu(page, viewport.width);
  await page.getByRole("button", { name: "+ Cà phê đen" }).click();
  await page.getByRole("button", { name: "+ Trà chanh" }).click();
  await page.getByRole("button", { name: "+ Cà phê đen" }).click();

  await openOrder(page, viewport.width);
}

test.describe("issue #3 tablet/desktop visual evidence", () => {
  test("order-entry: table → add items → lines/total/checkout, no overflow", async ({
    page,
  }, testInfo) => {
    const viewport = testInfo.project.use.viewport;
    if (!viewport?.width || !viewport.height) {
      throw new Error("isolated visual suite requires an explicit viewport");
    }
    const tag = tagFor({ width: viewport.width, height: viewport.height });

    await seedOrder(page, viewport);

    const cafeLine = orderLine(page, "Cà phê đen");
    const teaLine = orderLine(page, "Trà chanh");
    await expect(cafeLine).toBeVisible();
    await expect(cafeLine.locator("span.font-semibold")).toHaveText("2");
    await expect(teaLine).toBeVisible();
    await expect(teaLine.locator("span.font-semibold")).toHaveText("1");
    await expect(
      visibleMain(page).locator("span.text-xl.font-bold"),
    ).toContainText("70.000");

    const checkoutBtn = visibleMain(page).getByRole("button", {
      name: "Thanh toán",
    });
    await expect(checkoutBtn).toBeEnabled();

    await assertBoxFitsViewport(page, checkoutBtn, viewport);
    await assertBoxFitsViewport(
      page,
      cafeLine.getByRole("button", { name: "Tăng số lượng Cà phê đen" }),
      viewport,
    );
    await assertNoOverflow(page);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `issue-3-order-entry-${tag}.png`),
      fullPage: false,
    });
  });

  test("order-line controls: increment, decrement, remove, empty state, no overflow", async ({
    page,
  }, testInfo) => {
    const viewport = testInfo.project.use.viewport;
    if (!viewport?.width || !viewport.height) {
      throw new Error("isolated visual suite requires an explicit viewport");
    }
    const tag = tagFor({ width: viewport.width, height: viewport.height });

    await seedOrder(page, viewport);

    const cafeLine = orderLine(page, "Cà phê đen");
    const teaLine = orderLine(page, "Trà chanh");
    const total = visibleMain(page).locator("span.text-xl.font-bold");

    await cafeLine.getByRole("button", { name: "Tăng số lượng Cà phê đen" }).click();
    await expect(cafeLine.locator("span.font-semibold")).toHaveText("3");
    await expect(total).toContainText("95.000");

    await cafeLine.getByRole("button", { name: "Giảm số lượng Cà phê đen" }).click();
    await expect(cafeLine.locator("span.font-semibold")).toHaveText("2");
    await expect(total).toContainText("70.000");

    await teaLine.getByRole("button", { name: "Giảm số lượng Trà chanh" }).click();
    await expect(teaLine).not.toBeVisible();
    await expect(total).toContainText("50.000");

    await cafeLine.getByRole("button", { name: "Xóa Cà phê đen khỏi đơn" }).click();
    await expect(
      visibleMain(page).locator('[data-testid="order-empty-state"]'),
    ).toBeVisible();
    await expect(total).toContainText("0");
    await expect(
      visibleMain(page).getByRole("button", { name: "Thanh toán" }),
    ).toBeDisabled();

    await assertNoOverflow(page);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `issue-3-order-controls-${tag}.png`),
      fullPage: false,
    });
  });
});
