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
  await cafeLineAfter.getByRole("button", { name: "Xóa Cà phê đen khỏi đơn" }).click();

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

// ---------------------------------------------------------------------------
// Microtask 4 – keyboard / accessibility flow (390 × 844)
//
// RED spec (documented before upstream source existed):
//   - Buttons must carry exact role-accessible names so that screen-reader
//     users and keyboard-only users can operate each order-line control by
//     name alone (no class/positional selectors).
//   - Activating Tăng/Giảm via keyboard (Enter / Space) must leave focus on
//     the activated button so the user does not have to re-navigate.
//   - The live region (role="status") must surface the updated quantity or
//     deletion message immediately after each action.
//   - After the last item is deleted, focus must land on the empty-state
//     container (tabIndex=-1) so keyboard users receive tactile confirmation.
//   - Checkout must be disabled and no horizontal scroll must appear.
//
// Current source already satisfies all of these contracts; the test verifies
// the contract is upheld on every subsequent change.
// ---------------------------------------------------------------------------
test("order-entry: keyboard/a11y – Tab to controls, Enter/Space activate, focus stays, live-region announced, empty-state focused", async ({
  page,
}) => {
  const a11yScreenshot = "/tmp/small-pos-order-a11y-390x844.png";

  // ── 1. Sign in ──────────────────────────────────────────────────────────
  await signIn(page);

  // ── 2. Select Bàn 1 ─────────────────────────────────────────────────────
  const ban1Button = page.getByRole("button", { name: /Bàn 1/ });
  await ban1Button.click();
  await expect(ban1Button).toContainText("Có khách");

  // ── 3. Add Cà phê đen × 2 + Trà chanh × 1 via Thực đơn tab ─────────────
  await page.getByRole("tab", { name: /^Thực đơn/ }).click();
  await page.getByRole("button", { name: "+ Cà phê đen" }).click();
  await page.getByRole("button", { name: "+ Cà phê đen" }).click();
  await page.getByRole("button", { name: "+ Trà chanh" }).click();

  // ── 4. Open Đơn tab ──────────────────────────────────────────────────────
  await page.getByRole("tab", { name: /^Đơn/ }).click();

  const orderTab = page.locator('[role="tabpanel"][data-state="active"]');

  // Confirm starting state: coffee qty=2, tea qty=1.
  const cafeLine = orderTab.locator('[class*="rounded-xl"]', { hasText: "Cà phê đen" });
  const teaLine  = orderTab.locator('[class*="rounded-xl"]', { hasText: "Trà chanh" });
  await expect(cafeLine.locator("span.font-semibold")).toHaveText("2");
  await expect(teaLine.locator("span.font-semibold")).toHaveText("1");

  // ── 5. Tab until `Tăng số lượng Cà phê đen` is focused ──────────────────
  // The first interactive element in the order panel is the Đơn tab itself.
  // We focus the Đơn tab and then Tab forward through the panel to reach the
  // plus button of the coffee line.
  // DOM order per line: Giảm → (hidden span) → Tăng → Xóa
  // Two lines: coffee-minus, coffee-plus, coffee-trash, tea-minus, tea-plus, tea-trash.
  // We start focus at the Đơn tab and Tab until the plus button for coffee is active.

  const coffeePlusBtn = page.getByRole("button", { name: "Tăng số lượng Cà phê đen" });
  const coffeeMinusBtn = page.getByRole("button", { name: "Giảm số lượng Cà phê đen" });

  // Move focus into the page and Tab until the coffee plus button is reached.
  await page.getByRole("tab", { name: /^Đơn/ }).focus();
  // Tab forward repeatedly until coffeePlusBtn receives focus.
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    if (focused === "Tăng số lượng Cà phê đen") break;
  }
  await expect(coffeePlusBtn).toBeFocused();

  // ── 6. Enter on plus → qty 3, focus remains on plus ──────────────────────
  const liveRegion = orderTab.locator('[role="status"]');

  await page.keyboard.press("Enter");
  await expect(cafeLine.locator("span.font-semibold")).toHaveText("3");
  // Live region must announce the new quantity.
  await expect(liveRegion).toContainText("Cà phê đen, số lượng 3");
  // Focus must stay on the plus button.
  await expect(coffeePlusBtn).toBeFocused();

  // ── 7. Space on `Giảm số lượng Cà phê đen` → qty 2, focus stays on minus ─
  // Focus the minus button directly (role + name locator only).
  await coffeeMinusBtn.focus();
  await page.keyboard.press("Space");
  await expect(cafeLine.locator("span.font-semibold")).toHaveText("2");
  // Live region must announce the decremented quantity.
  await expect(liveRegion).toContainText("Cà phê đen, số lượng 2");
  // Focus must stay on the minus button.
  await expect(coffeeMinusBtn).toBeFocused();

  // ── 8. Focus `Xóa Cà phê đen khỏi đơn`, Enter → coffee removed ───────────
  const coffeeTrashBtn = page.getByRole("button", { name: "Xóa Cà phê đen khỏi đơn" });
  await coffeeTrashBtn.focus();
  await page.keyboard.press("Enter");

  // Coffee line must be gone.
  await expect(cafeLine).not.toBeVisible();

  // After deletion the focus target is computed by computeFocusTarget:
  // snapshot=[coffee, tea], deletedIndex=0 → remaining=[tea] → target=remaining[0]=tea.
  // So focus must move to `Xóa Trà chanh khỏi đơn`.
  const teaTrashBtn = page.getByRole("button", { name: "Xóa Trà chanh khỏi đơn" });
  await expect(teaTrashBtn).toBeFocused();

  // Live region must announce one item remains.
  await expect(liveRegion).toContainText("Đã xóa Cà phê đen khỏi đơn. Còn 1 món.");

  // ── 9. Space on `Xóa Trà chanh khỏi đơn` → empty state ──────────────────
  // teaTrashBtn already has focus from the previous step.
  await page.keyboard.press("Space");

  // Tea line must be gone.
  await expect(teaLine).not.toBeVisible();

  // Empty-state container (tabIndex=-1) must receive programmatic focus.
  const emptyState = orderTab.locator('[data-testid="order-empty-state"]');
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toBeFocused();

  // Live region must announce the order is empty.
  await expect(liveRegion).toContainText("Đã xóa Trà chanh khỏi đơn. Đơn hàng trống.");

  // ── 10. Checkout must be disabled ────────────────────────────────────────
  const checkoutBtn = orderTab.getByRole("button", { name: "Thanh toán" });
  await expect(checkoutBtn).toBeDisabled();

  // ── 11. No horizontal overflow ────────────────────────────────────────────
  const noOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
  expect(noOverflow).toBe(true);

  // ── 12. Screenshot ────────────────────────────────────────────────────────
  await page.screenshot({ path: a11yScreenshot, fullPage: false });
});

export { screenshot };
