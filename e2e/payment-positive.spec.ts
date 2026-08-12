import { expect, test } from "@playwright/test";

const screenshot = "/tmp/small-pos-receipt-390x844.png";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator('select[aria-label="Chọn nhân viên"]').selectOption({ label: "Fixture Manager" });
  await page.locator('input[type="password"]').fill("2468");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: "CafePOS", exact: true })).toBeVisible();
}

test("fixture payment releases matching table after cash payment", async ({ page }) => {
  await signIn(page);
  const table = page.getByRole("button", { name: /Bàn 1 Có khách/ });
  await expect(table).toBeVisible();
  await table.click();
  await expect(table).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("tab", { name: /^Đơn/ }).click();
  const checkout = page.getByRole("button", { name: "Thanh toán" }).last();
  await expect(checkout).toBeEnabled();
  await checkout.click();
  await page.getByLabel("Số tiền khách đưa").fill("60000");
  await expect(page.getByText(/Tiền thối:.*10\.000/)).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận thanh toán" }).click();
  await expect(page.getByRole("region", { name: "Hóa đơn thanh toán" })).toBeVisible();
  await expect(page.getByText(/mã thanh toán/i)).toBeVisible();
  await expect(page.getByText(/tiền mặt/i)).toBeVisible();
  await page.screenshot({ path: screenshot, fullPage: false });

  await page.getByRole("button", { name: "Đóng" }).click();
  await expect(page.getByRole("dialog", { name: "Thanh toán" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Bàn", exact: true }).click();
  const releasedTable = page.getByRole("button", { name: /Bàn 1 Trống/ });
  await expect(releasedTable).toBeVisible();
  await expect(releasedTable).toHaveAttribute("aria-pressed", "false");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(overflow).toBe(true);
});

export { screenshot };
