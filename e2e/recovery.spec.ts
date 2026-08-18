import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const shop = "Quán Khôi Phục";
const manager = "Chủ khôi phục";
const pin = "5821";

async function completeWizard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Thiết lập quán" })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Tên quán").fill(shop);
  await page.getByLabel("Số bàn").fill("2");
  await page.getByLabel("Tên quản lý").fill(manager);
  await page.getByLabel("PIN 4 số").fill(pin);
  await page.getByRole("button", { name: "Tạo quán" }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible({ timeout: 20_000 });
}

async function signIn(page: Page) {
  await page.getByLabel("Chọn nhân viên").selectOption({ label: manager });
  await page.getByLabel("PIN").fill(pin);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: "CafePOS" })).toBeVisible({ timeout: 15_000 });
}

async function clearAppConfig(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("small-pos");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("appConfig", "readwrite");
      transaction.objectStore("appConfig").clear();
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  }));
}

async function tenantNames(page: Page): Promise<string[]> {
  return page.evaluate(() => new Promise<string[]>((resolve, reject) => {
    const request = indexedDB.open("small-pos");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("tenants", "readonly");
      const read = transaction.objectStore("tenants").getAll();
      read.onsuccess = () => {
        database.close();
        resolve((read.result as Array<{ name?: string }>).map((row) => String(row.name ?? "")));
      };
      read.onerror = () => reject(read.error);
    };
  }));
}

test("corrupt database recovers from a good v2 backup and rejects a bad file", async ({ page }, testInfo) => {
  await completeWizard(page);
  await signIn(page);
  await page.getByRole("button", { name: "Sao lưu" }).click();
  await expect(page.getByRole("heading", { name: "Sao lưu dữ liệu" })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Tải sao lưu" }).click(),
  ]);
  const goodBackup = testInfo.outputPath("good-v2-backup.json");
  await download.saveAs(goodBackup);

  await clearAppConfig(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Không thể đọc dữ liệu quán" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("0000")).toHaveCount(0);
  expect(await tenantNames(page)).toEqual([shop]);

  const badBackup = testInfo.outputPath("bad-backup.json");
  await writeFile(badBackup, "{");
  await page.getByLabel("Nhập sao lưu").setInputFiles(badBackup);
  await expect(page.getByRole("alert")).toContainText("Không thể nhập sao lưu");
  await expect(page.getByRole("heading", { name: "Không thể đọc dữ liệu quán" })).toBeVisible();
  expect(await tenantNames(page)).toEqual([shop]);

  await page.getByLabel("Nhập sao lưu").setInputFiles(goodBackup);
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(shop)).toBeVisible();
  await signIn(page);
  await expect(page.getByRole("button", { name: /Bàn 1/i }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(shop)).toBeVisible();
  await signIn(page);
  await expect(page.getByRole("heading", { name: "CafePOS" })).toBeVisible();
});
