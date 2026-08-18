import "fake-indexeddb/auto";
import { afterEach, expect, test } from "vitest";
import { PosDatabase } from "../../packages/pos-storage/src/db";
import { exportBackup } from "../../packages/pos-storage/src/backup";
import { completeFirstRun } from "./product-setup";
import { importDexieRecoveryBackup } from "./dexie-backup";
import { loadProductBootstrap } from "./product-bootstrap";

const opened: PosDatabase[] = [];

afterEach(async () => {
  while (opened.length > 0) {
    const database = opened.pop()!;
    database.close();
    await database.delete();
  }
});

test("recovery import restores a first-run backup without persist session", async () => {
  const source = new PosDatabase(`pos-recovery-src-${crypto.randomUUID()}`);
  const targetName = `pos-recovery-dst-${crypto.randomUUID()}`;
  opened.push(source);
  await source.open();
  const setup = await completeFirstRun(source, {
    shopName: "Quán Nhà",
    tableCount: 2,
    managerName: "Chủ quán",
    pin: "5821",
    seedSampleMenu: false,
  });
  expect(setup.ok).toBe(true);
  const json = await exportBackup(source);

  const imported = await importDexieRecoveryBackup({ databaseName: targetName }, json);
  expect(imported).toBe(true);
  const boot = await loadProductBootstrap({ databaseName: targetName });
  expect(boot.kind).toBe("ready");
  if (boot.kind !== "ready") return;
  expect(boot.tenant.name).toBe("Quán Nhà");
});

test("recovery import rejects a bad backup and leaves the existing database", async () => {
  const target = new PosDatabase(`pos-recovery-keep-${crypto.randomUUID()}`);
  opened.push(target);
  await target.open();
  const setup = await completeFirstRun(target, {
    shopName: "Quán Giữ",
    tableCount: 1,
    managerName: "Chủ quán",
    pin: "5821",
    seedSampleMenu: false,
  });
  expect(setup.ok).toBe(true);
  await target.appConfig.clear();
  const before = await target.tenants.toArray();
  const imported = await importDexieRecoveryBackup({ databaseName: target.name }, "{");
  expect(imported).toBe(false);
  expect(await target.tenants.toArray()).toEqual(before);
  expect(await target.appConfig.count()).toBe(0);
});
