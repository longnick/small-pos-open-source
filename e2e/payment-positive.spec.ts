import { expect, test } from "@playwright/test";

const screenshot = "/tmp/small-pos-payment-success-390x844.png";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator('select[aria-label="Chọn nhân viên"]').selectOption({ label: "Fixture Manager" });
  await page.locator('input[type="password"]').fill("2468");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: "CafePOS", exact: true })).toBeVisible();
}

test("fixture payment: cash change, receipt, and paid-order denial", async ({ page }) => {
  await signIn(page);
  await page.getByRole("tab", { name: /^Đơn/ }).click();
  const checkout = page.getByRole("button", { name: "Thanh toán" }).last();
  await expect(checkout).toBeEnabled();
  await checkout.click();
  await page.getByLabel("Số tiền khách đưa").fill("60000");
  await expect(page.getByText(/Tiền thối:.*10\.000/)).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận thanh toán" }).click();
  await expect(page.getByRole("dialog", { name: "Thanh toán" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Thanh toán" }).last()).toBeDisabled();
  await page.screenshot({ path: screenshot, fullPage: false });
});

export { screenshot };
