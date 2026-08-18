import "fake-indexeddb/auto";
import Dexie from "dexie";
import { expect, test } from "vitest";
import { PosDatabase } from "../src/db";

const V1_STORES = {
  tenants: "id",
  staff: "id, tenantId, pinHash",
  catalogGroups: "id, tenantId",
  catalogItems: "id, tenantId, groupId, [tenantId+available]",
  tables: "id, tenantId, number",
  orders: "id, tenantId, tableId, status, createdAt",
  payments: "id, orderId, tenantId, createdAt",
  shifts: "id, tenantId, staffId, openedAt",
  auditLog: "id, tenantId, timestamp, action",
} as const;

test("opens additive v2 schema with appConfig and preserved v1 stores", async () => {
  const database = new PosDatabase(`pos-storage-v2-${crypto.randomUUID()}`);
  try {
    await database.open();
    expect(database.verno).toBe(2);
    expect(database.tables.map(({ name }) => name).sort()).toEqual([
      "appConfig",
      "auditLog",
      "catalogGroups",
      "catalogItems",
      "orders",
      "payments",
      "shifts",
      "staff",
      "tables",
      "tenants",
    ]);
    expect(database.appConfig.schema.primKey.keyPath).toBe("id");
  } finally {
    database.close();
    await database.delete();
  }
});

test("upgrades an existing v1 database without dropping tenant rows", async () => {
  const name = `pos-storage-v1-upgrade-${crypto.randomUUID()}`;
  const legacy = new Dexie(name);
  legacy.version(1).stores(V1_STORES);
  await legacy.open();
  await legacy.table("tenants").add({ id: "tenant-kept", name: "Kept Cafe" });
  legacy.close();

  const database = new PosDatabase(name);
  try {
    await database.open();
    expect(database.verno).toBe(2);
    await expect(database.tenants.get("tenant-kept")).resolves.toEqual({ id: "tenant-kept", name: "Kept Cafe" });
    expect(database.tables.some((table) => table.name === "appConfig")).toBe(true);
    expect(await database.appConfig.count()).toBe(0);
  } finally {
    database.close();
    await database.delete();
  }
});
