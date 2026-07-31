import "fake-indexeddb/auto";
import { expect, test } from "vitest";
import { PosDatabase } from "../src/db";
import { exportBackup, importBackup } from "../src/backup";

const stores = [
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

function createDatabase() {
  return new PosDatabase(`pos-storage-backup-test-${crypto.randomUUID()}`);
}

async function seed(database: PosDatabase, suffix: string) {
  await Promise.all(
    stores.map((store, index) =>
      database.table(store).bulkAdd([{ id: `${store}-${suffix}`, value: index }]),
    ),
  );
}

async function readAll(database: PosDatabase) {
  return Object.fromEntries(
    await Promise.all(stores.map(async (store) => [store, await database.table(store).toArray()])),
  );
}

test("exports and imports all v1 stores", async () => {
  const source = createDatabase();
  const target = createDatabase();

  try {
    await source.open();
    await target.open();
    await seed(source, "source");

    const json = await exportBackup(source);
    const backup = JSON.parse(json);

    expect(Object.keys(backup.data)).toEqual(stores);
    expect(backup.version).toBe(1);
    expect(Number.isFinite(backup.exportedAt)).toBe(true);

    await importBackup(target, json);
    expect(await readAll(target)).toEqual(await readAll(source));
  } finally {
    source.close();
    target.close();
    await source.delete();
    await target.delete();
  }
});

test.each([
  ["malformed JSON", "{"],
  ["wrong version", JSON.stringify({ version: 2, exportedAt: 0, data: Object.fromEntries(stores.map((store) => [store, []])) })],
  ["missing store", JSON.stringify({ version: 1, exportedAt: 0, data: Object.fromEntries(stores.slice(1).map((store) => [store, []])) })],
  ["unknown store", JSON.stringify({ version: 1, exportedAt: 0, data: { ...Object.fromEntries(stores.map((store) => [store, []])), extra: [] } })],
  ["non-array store", JSON.stringify({ version: 1, exportedAt: 0, data: { ...Object.fromEntries(stores.map((store) => [store, []])), tenants: {} } })],
])("rejects %s without changing database", async (_name, json) => {
  const database = createDatabase();

  try {
    await database.open();
    await seed(database, "existing");
    const before = await readAll(database);

    await expect(importBackup(database, json)).rejects.toThrow(Error);
    expect(await readAll(database)).toEqual(before);
  } finally {
    database.close();
    await database.delete();
  }
});

test("successful import replaces every store", async () => {
  const database = createDatabase();
  const replacement = JSON.stringify({
    version: 1,
    exportedAt: 0,
    data: Object.fromEntries(stores.map((store, index) => [store, [{ id: `${store}-replacement`, value: index }]])),
  });

  try {
    await database.open();
    await seed(database, "old");

    await importBackup(database, replacement);
    expect(await readAll(database)).toEqual(
      Object.fromEntries(stores.map((store, index) => [store, [{ id: `${store}-replacement`, value: index }] ])),
    );
  } finally {
    database.close();
    await database.delete();
  }
});
