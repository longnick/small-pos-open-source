import "fake-indexeddb/auto";
import { afterEach, expect, test } from "vitest";
import { PosDatabase } from "../../packages/pos-storage/src/db";
import { completeFirstRun, readProductSetupState, verifyStoredPin } from "./product-setup";

const opened: PosDatabase[] = [];

async function openDb(): Promise<PosDatabase> {
  const database = new PosDatabase(`pos-setup-test-${crypto.randomUUID()}`);
  await database.open();
  opened.push(database);
  return database;
}

afterEach(async () => {
  while (opened.length > 0) {
    const database = opened.pop()!;
    database.close();
    await database.delete();
  }
});

test("empty database is needs-setup", async () => {
  const database = await openDb();
  await expect(readProductSetupState(database)).resolves.toEqual({ kind: "needs-setup" });
});

test("completeFirstRun persists shop, tables, and manager then becomes ready", async () => {
  const database = await openDb();
  const result = await completeFirstRun(database, {
    shopName: "Quán Nhà",
    tableCount: 3,
    managerName: "Chủ quán",
    pin: "5821",
    seedSampleMenu: false,
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.tenantId).toMatch(/^tenant-/);
  await expect(readProductSetupState(database)).resolves.toEqual({ kind: "ready", tenantId: result.tenantId });

  const tenants = await database.tenants.toArray();
  expect(tenants).toHaveLength(1);
  expect(tenants[0].id).toBe(result.tenantId);
  expect(tenants[0].name).toBe("Quán Nhà");
  expect(tenants[0].currency).toBe("VND");
  expect(tenants[0].tableCount).toBe(3);

  const staff = await database.staff.toArray();
  expect(staff).toHaveLength(1);
  expect(staff[0].tenantId).toBe(result.tenantId);
  expect(staff[0].name).toBe("Chủ quán");
  expect(staff[0].role).toBe("manager");
  expect(staff[0]).not.toHaveProperty("pin");
  expect(staff[0].pinHash).toMatch(/^v1\$/);
  expect(staff[0].pinHash).not.toContain("5821");

  const tables = await database.posTables.toArray();
  expect(tables.map((row) => row.number).sort((a, b) => a - b)).toEqual([1, 2, 3]);
  expect(tables.every((row) => row.tenantId === result.tenantId)).toBe(true);
  expect(tables.every((row) => row.status === "empty")).toBe(true);

  const config = await database.appConfig.get("product");
  expect(config).toMatchObject({ id: "product", tenantId: result.tenantId });
  expect(typeof config?.completedAt).toBe("number");
});

test("completeFirstRun rejects invalid input and leaves database empty", async () => {
  const database = await openDb();
  const rejected = await Promise.all([
    completeFirstRun(database, { shopName: "  ", tableCount: 3, managerName: "Chủ quán", pin: "5821", seedSampleMenu: false }),
    completeFirstRun(database, { shopName: "Quán Nhà", tableCount: 0, managerName: "Chủ quán", pin: "5821", seedSampleMenu: false }),
    completeFirstRun(database, { shopName: "Quán Nhà", tableCount: 11, managerName: "Chủ quán", pin: "5821", seedSampleMenu: false }),
    completeFirstRun(database, { shopName: "Quán Nhà", tableCount: 3, managerName: "Chủ quán", pin: "582", seedSampleMenu: false }),
    completeFirstRun(database, { shopName: "Quán Nhà", tableCount: 3, managerName: "Chủ quán", pin: "abcd", seedSampleMenu: false }),
    completeFirstRun(database, { shopName: "Quán Nhà", tableCount: 3, managerName: "", pin: "5821", seedSampleMenu: false }),
  ]);

  expect(rejected.every((result) => result.ok === false)).toBe(true);
  expect(await database.tenants.count()).toBe(0);
  expect(await database.staff.count()).toBe(0);
  expect(await database.posTables.count()).toBe(0);
  await expect(readProductSetupState(database)).resolves.toEqual({ kind: "needs-setup" });
});

test("completeFirstRun refuses a second setup on the same database", async () => {
  const database = await openDb();
  const first = await completeFirstRun(database, {
    shopName: "Quán Nhà",
    tableCount: 2,
    managerName: "Chủ quán",
    pin: "5821",
    seedSampleMenu: false,
  });
  expect(first.ok).toBe(true);

  const second = await completeFirstRun(database, {
    shopName: "Quán Khác",
    tableCount: 4,
    managerName: "Người khác",
    pin: "9999",
    seedSampleMenu: true,
  });
  expect(second.ok).toBe(false);
  expect(await database.tenants.count()).toBe(1);
  expect((await database.tenants.toArray())[0].name).toBe("Quán Nhà");
  expect(await database.staff.count()).toBe(1);
  expect(await database.posTables.count()).toBe(2);
});

test("optional sample menu writes tenant-scoped catalog only", async () => {
  const database = await openDb();
  const result = await completeFirstRun(database, {
    shopName: "Quán Nhà",
    tableCount: 1,
    managerName: "Chủ quán",
    pin: "5821",
    seedSampleMenu: true,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const groups = await database.catalogGroups.toArray();
  const items = await database.catalogItems.toArray();
  expect(groups.length).toBeGreaterThan(0);
  expect(items.length).toBeGreaterThan(0);
  expect(groups.every((row) => row.tenantId === result.tenantId)).toBe(true);
  expect(items.every((row) => row.tenantId === result.tenantId)).toBe(true);
  expect(items.every((row) => Number.isSafeInteger(row.price) && row.price >= 0)).toBe(true);
  expect(JSON.stringify({ groups, items })).not.toMatch(/"pin"\s*:/);
});

test("stored manager pinHash verifies only the chosen PIN", async () => {
  const database = await openDb();
  const result = await completeFirstRun(database, {
    shopName: "Quán Nhà",
    tableCount: 1,
    managerName: "Chủ quán",
    pin: "5821",
    seedSampleMenu: false,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const manager = (await database.staff.toArray())[0];
  await expect(verifyStoredPin("5821", manager.pinHash)).resolves.toBe(true);
  await expect(verifyStoredPin("0000", manager.pinHash)).resolves.toBe(false);
  await expect(verifyStoredPin("582", manager.pinHash)).resolves.toBe(false);
});

test("tenant rows without matching appConfig are corrupt", async () => {
  const database = await openDb();
  const first = await completeFirstRun(database, {
    shopName: "Quán Nhà",
    tableCount: 1,
    managerName: "Chủ quán",
    pin: "5821",
    seedSampleMenu: false,
  });
  expect(first.ok).toBe(true);
  await database.appConfig.clear();
  await expect(readProductSetupState(database)).resolves.toEqual({ kind: "corrupt" });
});

test("ready state rejects tenant currency or table-number mismatch", async () => {
  const database = await openDb();
  const first = await completeFirstRun(database, {
    shopName: "Quán Nhà",
    tableCount: 2,
    managerName: "Chủ quán",
    pin: "5821",
    seedSampleMenu: false,
  });
  expect(first.ok).toBe(true);
  const tenant = (await database.tenants.toArray())[0];
  await database.tenants.put({ ...tenant, currency: "USD" as never });
  await expect(readProductSetupState(database)).resolves.toEqual({ kind: "corrupt" });
});

test("ready state rejects manager pinHash that is not versioned", async () => {
  const database = await openDb();
  const first = await completeFirstRun(database, {
    shopName: "Quán Nhà",
    tableCount: 1,
    managerName: "Chủ quán",
    pin: "5821",
    seedSampleMenu: false,
  });
  expect(first.ok).toBe(true);
  const manager = (await database.staff.toArray())[0];
  await database.staff.put({ ...manager, pinHash: "not-a-hash" });
  await expect(readProductSetupState(database)).resolves.toEqual({ kind: "corrupt" });
});
