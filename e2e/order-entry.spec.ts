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

export { screenshot };
