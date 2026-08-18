import "fake-indexeddb/auto";
import { afterEach, expect, test } from "vitest";
import { PosDatabase } from "../../packages/pos-storage/src/db";
import { completeFirstRun } from "./product-setup";
import { loadProductBootstrap } from "./product-bootstrap";

const opened: PosDatabase[] = [];

async function openDb(): Promise<PosDatabase> {
  const database = new PosDatabase(`pos-boot-test-${crypto.randomUUID()}`);
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

test("empty database bootstraps as needs-setup without demo tenant", async () => {
  const database = await openDb();
  const boot = await loadProductBootstrap({ databaseName: database.name });
  expect(boot.kind).toBe("needs-setup");
  expect(JSON.stringify(boot)).not.toMatch(/tenant-demo|Quán Demo|"0000"|"1111"/);
});

test("completed first-run bootstraps ready tenant and manager from Dexie", async () => {
  const database = await openDb();
  const setup = await completeFirstRun(database, {
    shopName: "Quán Nhà",
    tableCount: 2,
    managerName: "Chủ quán",
    pin: "5821",
    seedSampleMenu: true,
  });
  expect(setup.ok).toBe(true);
  if (!setup.ok) return;

  const boot = await loadProductBootstrap({ databaseName: database.name });
  expect(boot.kind).toBe("ready");
  if (boot.kind !== "ready") return;
  expect(boot.tenant.id).toBe(setup.tenantId);
  expect(boot.tenant.name).toBe("Quán Nhà");
  expect(boot.staff).toHaveLength(1);
  expect(boot.staff[0].name).toBe("Chủ quán");
  expect(boot.staff[0]).not.toHaveProperty("pin");
  expect(boot.tables).toHaveLength(2);
  expect(boot.catalogItems.length).toBeGreaterThan(0);
  expect(typeof boot.verifier).toBe("function");
  expect(boot.persistable).toBe(true);
  await expect(boot.verifier("5821", boot.staff[0].pinHash)).resolves.toBe(true);
  await expect(boot.verifier("0000", boot.staff[0].pinHash)).resolves.toBe(false);
});

test("missing appConfig after tenant rows bootstraps as corrupt", async () => {
  const database = await openDb();
  const setup = await completeFirstRun(database, {
    shopName: "Quán Nhà",
    tableCount: 1,
    managerName: "Chủ quán",
    pin: "5821",
    seedSampleMenu: false,
  });
  expect(setup.ok).toBe(true);
  await database.appConfig.clear();
  const boot = await loadProductBootstrap({ databaseName: database.name });
  expect(boot.kind).toBe("corrupt");
});
