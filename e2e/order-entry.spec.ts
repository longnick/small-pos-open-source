import { expect, test } from "@playwright/test";

const screenshot = "/tmp/small-pos-order-entry-390x844.png";

/** Sign in as Fixture Manager using the generic fixture PIN. */
async function signIn(page: import("@playwright/test").Page) {
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

test("order-entry: select empty table, add items, verify order lines and total, checkout enabled", async ({
  page,
}) => {
  // ── 1. Sign in ──────────────────────────────────────────────────────────
  await signIn(page);

  // ── 2. Select Bàn 1 (empty) and assert it becomes Có khách ─────────────
  // The mobile layout starts on the "Bàn" tab by default.
  const ban1Button = page.getByRole("button", { name: /Bàn 1/ });
  await expect(ban1Button).toBeVisible();

  // Before selection the table must show "Trống".
  await expect(ban1Button).toContainText("Trống");

  await ban1Button.click();

  // After selection the table must transition to "Có khách".
  await expect(ban1Button).toContainText("Có khách");

  // ── 3. Navigate to Thực đơn tab ──────────────────────────────────────────
  await page.getByRole("tab", { name: /^Thực đơn/ }).click();

  // Confirm the menu heading is visible.
  await expect(
    page.getByRole("heading", { name: "Thực đơn" }),
  ).toBeVisible();

  // ── 4. Add Cà phê đen once ───────────────────────────────────────────────
  await page.getByRole("button", { name: "+ Cà phê đen" }).click();

  // ── 5. Add Trà chanh once ────────────────────────────────────────────────
  await page.getByRole("button", { name: "+ Trà chanh" }).click();

  // ── 6. Add Cà phê đen a second time ──────────────────────────────────────
  await page.getByRole("button", { name: "+ Cà phê đen" }).click();

  // ── 7. Navigate to Đơn tab ───────────────────────────────────────────────
  await page.getByRole("tab", { name: /^Đơn/ }).click();

  // ── 8. Assert order lines ────────────────────────────────────────────────
  // Scope to the active order TabsContent panel (data-state="active").
  // The inactive panels are still in the DOM so we must narrow to avoid strict
  // mode violations from duplicate elements across tab panels.
  const orderTab = page.locator('[role="tabpanel"][data-state="active"]');

  // "Cà phê đen" must appear with quantity 2.
  const cafeLine = orderTab.locator(
    '[class*="rounded-xl"]',
    { hasText: "Cà phê đen" },
  );
  await expect(cafeLine).toBeVisible();
  await expect(cafeLine.locator("span.font-semibold")).toHaveText("2");

  // "Trà chanh" must appear with quantity 1.
  const teaLine = orderTab.locator(
    '[class*="rounded-xl"]',
    { hasText: "Trà chanh" },
  );
  await expect(teaLine).toBeVisible();
  await expect(teaLine.locator("span.font-semibold")).toHaveText("1");

  // ── 9. Assert total = 70.000 VND ─────────────────────────────────────────
  // 2 × 25 000 + 1 × 20 000 = 70 000 VND
  // Scope to the active order panel to avoid duplicates from inactive tab panels.
  await expect(
    orderTab.locator("span.text-xl.font-bold"),
  ).toContainText("70.000");

  // ── 10. Assert Thanh toán button is enabled ───────────────────────────────
  const checkoutBtn = orderTab.getByRole("button", { name: "Thanh toán" });
  await expect(checkoutBtn).toBeEnabled();

  // ── 11. Assert no horizontal overflow ────────────────────────────────────
  const noOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
  expect(noOverflow).toBe(true);

  // ── 12. Screenshot ────────────────────────────────────────────────────────
  await page.screenshot({ path: screenshot, fullPage: false });
});

// ---------------------------------------------------------------------------
// Order-line controls: Tăng / Giảm / Xóa
// Extends the dedicated 390×844 fixture flow after
// 2× Cà phê đen (25 000 VND) + 1× Trà chanh (20 000 VND) = 70 000 VND.
// ---------------------------------------------------------------------------
test("order-entry: order-line controls – increment, decrement, remove-at-1, trash, empty state", async ({
  page,
}) => {
  const controlsScreenshot = "/tmp/small-pos-order-controls-390x844.png";

  // ── 1. Sign in ──────────────────────────────────────────────────────────
  await signIn(page);

  // ── 2. Select Bàn 1 ─────────────────────────────────────────────────────
  const ban1Button = page.getByRole("button", { name: /Bàn 1/ });
  await ban1Button.click();
  await expect(ban1Button).toContainText("Có khách");

  // ── 3. Navigate to Thực đơn tab ──────────────────────────────────────────
  await page.getByRole("tab", { name: /^Thực đơn/ }).click();

  // ── 4. Add Cà phê đen × 2 + Trà chanh × 1 ───────────────────────────────
  await page.getByRole("button", { name: "+ Cà phê đen" }).click();
  await page.getByRole("button", { name: "+ Cà phê đen" }).click();
  await page.getByRole("button", { name: "+ Trà chanh" }).click();

  // ── 5. Navigate to Đơn tab ───────────────────────────────────────────────
  await page.getByRole("tab", { name: /^Đơn/ }).click();

  // Scope every assertion to the active order tab panel.
  const orderTab = page.locator('[role="tabpanel"][data-state="active"]');

  // Confirm starting state: coffee qty=2, tea qty=1, total=70.000
  const cafeLine = orderTab.locator('[class*="rounded-xl"]', { hasText: "Cà phê đen" });
  const teaLine  = orderTab.locator('[class*="rounded-xl"]', { hasText: "Trà chanh" });

  await expect(cafeLine.locator("span.font-semibold")).toHaveText("2");
  await expect(teaLine.locator("span.font-semibold")).toHaveText("1");
  await expect(orderTab.locator("span.text-xl.font-bold")).toContainText("70.000");

  // ── 6. Coffee: Tăng số lượng 2→3 → total 95.000 ─────────────────────────
  // Scope the "Tăng số lượng" button strictly inside the coffee order line
  // to avoid a strict-mode violation from the tea line's identically-named button.
  await cafeLine.getByRole("button", { name: "Tăng số lượng" }).click();
  await expect(cafeLine.locator("span.font-semibold")).toHaveText("3");
  await expect(orderTab.locator("span.text-xl.font-bold")).toContainText("95.000");

  // ── 7. Coffee: Giảm số lượng 3→2 → total 70.000 ─────────────────────────
  await cafeLine.getByRole("button", { name: "Giảm số lượng" }).click();
  await expect(cafeLine.locator("span.font-semibold")).toHaveText("2");
  await expect(orderTab.locator("span.text-xl.font-bold")).toContainText("70.000");

  // ── 8. Tea: Giảm số lượng at qty=1 → removes tea → total 50.000 ──────────
  // Decrementing at qty=1 triggers removeItem, so the tea line disappears.
  await teaLine.getByRole("button", { name: "Giảm số lượng" }).click();
  await expect(teaLine).not.toBeVisible();
  await expect(orderTab.locator("span.text-xl.font-bold")).toContainText("50.000");

  // ── 9. Coffee: trash button → removes the last line → empty state ─────────
  // Re-query cafeLine in case the DOM was updated after tea removal.
  const cafeLineAfter = orderTab.locator('[class*="rounded-xl"]', { hasText: "Cà phê đen" });
  await cafeLineAfter.getByRole("button", { name: "Xóa món" }).click();

  // ── 10. Assert empty state ───────────────────────────────────────────────
  await expect(orderTab.locator("p", { hasText: "Chọn món để thêm vào đơn" })).toBeVisible();

  // ── 11. Assert subtotal and total display 0 ──────────────────────────────
  // Both "Tạm tính" and "Tổng cộng" rows must show 0 VND.
  const subtotalRow = orderTab.locator("div.flex.items-center.justify-between.text-sm");
  await expect(subtotalRow).toContainText("0");

  const totalLabel = orderTab.locator("span.text-xl.font-bold");
  await expect(totalLabel).toContainText("0");

  // ── 12. Assert Thanh toán button is disabled ──────────────────────────────
  const checkoutBtn = orderTab.getByRole("button", { name: "Thanh toán" });
  await expect(checkoutBtn).toBeDisabled();

  // ── 13. Assert no horizontal overflow ────────────────────────────────────
  const noOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
  expect(noOverflow).toBe(true);

  // ── 14. Screenshot after empty state ─────────────────────────────────────
  await page.screenshot({ path: controlsScreenshot, fullPage: false });
});

export { screenshot };
