import { expect, test } from "@playwright/test";

const V1_STORES = [
  "tenants",
  "staff",
  "catalogGroups",
  "catalogItems",
  "tables",
  "orders",
  "payments",
  "shifts",
  "auditLog",
] as const;

test("Chromium upgrades a real v1 IndexedDB and keeps the tenant row", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Thiết lập quán" })).toBeVisible({ timeout: 15_000 });

  await page.evaluate(async (stores) => {
    await new Promise<void>((resolve, reject) => {
      const closer = indexedDB.deleteDatabase("small-pos");
      closer.onsuccess = () => resolve();
      closer.onerror = () => reject(closer.error);
      closer.onblocked = () => resolve();
    });
    await new Promise<void>((resolve, reject) => {
      // Dexie v1 used IndexedDB version 10. Native v1 here is the live pre-Sprint-1 shape.
      const open = indexedDB.open("small-pos", 10);
      open.onupgradeneeded = () => {
        const database = open.result;
        for (const store of stores) {
          if (!database.objectStoreNames.contains(store)) database.createObjectStore(store, { keyPath: "id" });
        }
      };
      open.onsuccess = () => {
        const database = open.result;
        const transaction = database.transaction("tenants", "readwrite");
        transaction.objectStore("tenants").put({ id: "tenant-kept", name: "Kept Cafe" });
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      open.onerror = () => reject(open.error);
    });
  }, [...V1_STORES]);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Không thể đọc dữ liệu quán" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("0000")).toHaveCount(0);
  await expect(page.getByText("Quán Demo")).toHaveCount(0);

  const snapshot = await page.evaluate(() => new Promise<{ version: number; stores: string[]; tenant: unknown }>((resolve, reject) => {
    const open = indexedDB.open("small-pos");
    open.onsuccess = () => {
      const database = open.result;
      const version = database.version;
      const stores = Array.from(database.objectStoreNames);
      const transaction = database.transaction("tenants", "readonly");
      const read = transaction.objectStore("tenants").get("tenant-kept");
      read.onsuccess = () => {
        database.close();
        resolve({ version, stores, tenant: read.result });
      };
      read.onerror = () => reject(read.error);
    };
    open.onerror = () => reject(open.error);
  }));

  expect(snapshot.version).toBe(20);
  expect(snapshot.stores).toContain("appConfig");
  expect(snapshot.stores).toContain("tenants");
  expect(snapshot.tenant).toEqual({ id: "tenant-kept", name: "Kept Cafe" });
});
