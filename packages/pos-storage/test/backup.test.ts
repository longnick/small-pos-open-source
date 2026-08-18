import "fake-indexeddb/auto";
import { expect, test } from "vitest";
import { PosDatabase } from "../src/db";
import { exportBackup, importBackup } from "../src/backup";

const v1Stores = [
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

const v2Stores = [...v1Stores, "appConfig"] as const;

const pinHash = "v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function createDatabase() {
  return new PosDatabase(`pos-storage-backup-test-${crypto.randomUUID()}`);
}

async function seedViableShop(database: PosDatabase, name: string, tableCount: number) {
  const tenantId = `tenant-${name}`;
  const staffId = `staff-${name}`;
  await database.tenants.add({
    id: tenantId,
    name,
    address: "Chưa cập nhật",
    phone: "0000000000",
    currency: "VND",
    defaultTax: 0,
    defaultSurcharge: 0,
    tableCount,
    createdAt: 1,
  });
  await database.staff.add({
    id: staffId,
    tenantId,
    name: "Chủ quán",
    role: "manager",
    pinHash,
    createdAt: 1,
  });
  await database.appConfig.add({ id: "product", tenantId, completedAt: 1 });
  for (let number = 1; number <= tableCount; number += 1) {
    await database.posTables.add({
      id: `table-${name}-${number}`,
      tenantId,
      number,
      status: "empty",
      openedAt: 0,
      staffId,
    });
  }
}

async function readAll(database: PosDatabase) {
  return Object.fromEntries(
    await Promise.all(v2Stores.map(async (store) => [store, await database.table(store).toArray()])),
  );
}

test("exports version 2 including appConfig from a first-run shop", async () => {
  const source = createDatabase();
  const target = createDatabase();

  try {
    await source.open();
    await target.open();
    await seedViableShop(source, "Quán Nhà", 2);

    const json = await exportBackup(source);
    const backup = JSON.parse(json);

    expect(Object.keys(backup.data)).toEqual(v2Stores);
    expect(backup.version).toBe(2);
    expect(Number.isFinite(backup.exportedAt)).toBe(true);
    expect(backup.data.appConfig).toHaveLength(1);

    await importBackup(target, json);
    expect(await readAll(target)).toEqual(await readAll(source));
  } finally {
    source.close();
    target.close();
    await source.delete();
    await target.delete();
  }
});

test("rejects a v1 backup before any write", async () => {
  const database = createDatabase();
  const json = JSON.stringify({
    version: 1,
    exportedAt: 0,
    data: Object.fromEntries(v1Stores.map((store, index) => [store, [{ id: `${store}-v1`, value: index }]])),
  });

  try {
    await database.open();
    await seedViableShop(database, "Quán Nhà", 1);
    const before = await readAll(database);
    await expect(importBackup(database, json)).rejects.toThrow("unsupported-for-product-bootstrap");
    expect(await readAll(database)).toEqual(before);
  } finally {
    database.close();
    await database.delete();
  }
});

test("rejects a syntactically valid v2 backup that cannot bootstrap", async () => {
  const database = createDatabase();
  const json = JSON.stringify({
    version: 2,
    exportedAt: 0,
    data: Object.fromEntries(v2Stores.map((store) => [store, []])),
  });

  try {
    await database.open();
    await seedViableShop(database, "Quán Nhà", 1);
    const before = await readAll(database);
    await expect(importBackup(database, json)).rejects.toThrow("backup-not-product-viable");
    expect(await readAll(database)).toEqual(before);
  } finally {
    database.close();
    await database.delete();
  }
});

test.each([
  ["malformed JSON", "{"],
  ["wrong version", JSON.stringify({ version: 3, exportedAt: 0, data: Object.fromEntries(v2Stores.map((store) => [store, []])) })],
  ["missing store", JSON.stringify({ version: 2, exportedAt: 0, data: Object.fromEntries(v2Stores.slice(1).map((store) => [store, []])) })],
  ["unknown store", JSON.stringify({ version: 2, exportedAt: 0, data: { ...Object.fromEntries(v2Stores.map((store) => [store, []])), extra: [] } })],
  ["non-array store", JSON.stringify({ version: 2, exportedAt: 0, data: { ...Object.fromEntries(v2Stores.map((store) => [store, []])), tenants: {} } })],
])("rejects %s without changing database", async (_name, json) => {
  const database = createDatabase();

  try {
    await database.open();
    await seedViableShop(database, "Quán Nhà", 1);
    const before = await readAll(database);

    await expect(importBackup(database, json)).rejects.toThrow(Error);
    expect(await readAll(database)).toEqual(before);
  } finally {
    database.close();
    await database.delete();
  }
});

test("successful import replaces every store with a viable shop", async () => {
  const source = createDatabase();
  const database = createDatabase();

  try {
    await source.open();
    await database.open();
    await seedViableShop(database, "Quán Cũ", 1);
    await seedViableShop(source, "Quán Mới", 2);
    const json = await exportBackup(source);
    await importBackup(database, json);
    expect((await database.tenants.toArray())[0].name).toBe("Quán Mới");
    expect(await database.posTables.count()).toBe(2);
    expect(await database.appConfig.count()).toBe(1);
  } finally {
    source.close();
    database.close();
    await source.delete();
    await database.delete();
  }
});
