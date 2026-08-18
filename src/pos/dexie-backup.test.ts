import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { CatalogGroup, CatalogItem, PosTable, Staff, Tenant } from "../../packages/pos-core/src/types";
import { PosDatabase } from "../../packages/pos-storage/src/db";
import { exportBackup } from "../../packages/pos-storage/src/backup";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import { setDexiePersistSession } from "./dexie-persist";
import { exportDexieBackup, importDexieBackup } from "./dexie-backup";

const tenantId = "tenant-demo";
const pinHash = "v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

const tenant = (): Tenant => ({
  id: tenantId,
  name: "Quán Demo",
  address: "123 Đường ABC",
  phone: "0901234567",
  currency: "VND",
  defaultTax: 0,
  defaultSurcharge: 0,
  tableCount: 1,
  createdAt: 0,
});

const staff = (): Staff => ({
  id: "staff-1",
  tenantId,
  name: "Manager",
  role: "manager",
  pinHash,
  createdAt: 0,
});

const group = (): CatalogGroup => ({ id: "group-1", tenantId, name: "Nước uống", sortOrder: 0 });
const item = (): CatalogItem => ({
  id: "item-1",
  tenantId,
  groupId: "group-1",
  name: "Cà phê đen",
  price: 25_000,
  available: true,
  sortOrder: 0,
  createdAt: 1,
  updatedAt: 1,
});
const table = (): PosTable => ({
  id: "table-1",
  tenantId,
  number: 1,
  status: "empty",
  openedAt: 0,
  staffId: "staff-1",
});

async function withDb(seed: (database: PosDatabase) => Promise<void>, run: (name: string) => Promise<void>) {
  const name = `pos-backup-ui-test-${crypto.randomUUID()}`;
  const database = new PosDatabase(name);
  try {
    await database.open();
    await seed(database);
    await run(name);
  } finally {
    database.close();
    await database.delete();
  }
}

beforeEach(() => {
  useCatalogTableStore.getState().clear();
  useOrderPaymentStore.getState().clearCurrentOrder();
  setDexiePersistSession(true);
});

afterEach(() => {
  setDexiePersistSession(false);
  useCatalogTableStore.getState().clear();
  useOrderPaymentStore.getState().clearCurrentOrder();
});

test("exportDexieBackup returns JSON only after hydrate-success session", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.staff.add(staff());
    await database.catalogGroups.add(group());
    await database.catalogItems.add(item());
    await database.posTables.add(table());
  }, async (name) => {
    const json = await exportDexieBackup({ authenticatedTenantId: tenantId, databaseName: name });
    expect(json).not.toBeNull();
    const parsed = JSON.parse(json as string);
    expect(parsed.version).toBe(2);
    expect(parsed.data.appConfig).toBeDefined();
    expect(parsed.data.tenants).toHaveLength(1);
    expect(parsed.data.staff[0].pinHash).toBe(pinHash);
  });
});

test("exportDexieBackup is no-op when persist session is off", async () => {
  setDexiePersistSession(false);
  await withDb(async (database) => {
    await database.tenants.add(tenant());
  }, async (name) => {
    await expect(exportDexieBackup({ authenticatedTenantId: tenantId, databaseName: name })).resolves.toBeNull();
  });
});

test("importDexieBackup replaces stores then hydrates catalog/tables and clears currentOrder", async () => {
  useCatalogTableStore.getState().replaceTenantData(tenantId, {
    catalogGroups: [group()],
    catalogItems: [item()],
    tables: [table()],
  });
  useOrderPaymentStore.getState().selectOpenOrder({
    id: "order-old",
    tenantId,
    tableId: "table-1",
    staffId: "staff-1",
    status: "open",
    items: [],
    subtotal: 0,
    discount: 0,
    discountType: "amount",
    total: 0,
    createdAt: 1,
  });

  await withDb(async () => undefined, async (name) => {
    const source = new PosDatabase(`${name}-source`);
    try {
      await source.open();
      await source.tenants.add(tenant());
      await source.staff.add(staff());
      await source.catalogGroups.add({ ...group(), name: "Trà" });
      await source.catalogItems.add(item());
      await source.posTables.add(table());
      const json = await exportBackup(source);
      const result = await importDexieBackup({ authenticatedTenantId: tenantId, databaseName: name }, json);
      expect(result).toBe("imported");
      expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
      expect(useCatalogTableStore.getState().catalogGroups[0]?.name).toBe("Trà");
    } finally {
      source.close();
      await source.delete();
    }
  });
});

test("importDexieBackup rejects bad JSON without changing stores", async () => {
  useCatalogTableStore.getState().replaceTenantData(tenantId, {
    catalogGroups: [group()],
    catalogItems: [item()],
    tables: [table()],
  });
  const before = structuredClone(useCatalogTableStore.getState().catalogGroups);

  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.catalogGroups.add(group());
    await database.catalogItems.add(item());
    await database.posTables.add(table());
  }, async (name) => {
    await expect(importDexieBackup({ authenticatedTenantId: tenantId, databaseName: name }, "{")).resolves.toBe(false);
    expect(useCatalogTableStore.getState().catalogGroups).toEqual(before);
  });
});

test("importDexieBackup is no-op when persist session is off", async () => {
  setDexiePersistSession(false);
  await withDb(async () => undefined, async (name) => {
    await expect(importDexieBackup({ authenticatedTenantId: tenantId, databaseName: name }, "{}")).resolves.toBe(false);
  });
});

test("import that writes Dexie but fails hydrate clears stale catalog", async () => {
  useCatalogTableStore.getState().replaceTenantData(tenantId, {
    catalogGroups: [group()],
    catalogItems: [item()],
    tables: [table()],
  });
  useOrderPaymentStore.getState().selectOpenOrder({
    id: "order-old",
    tenantId,
    tableId: "table-1",
    staffId: "staff-1",
    status: "open",
    items: [],
    subtotal: 0,
    discount: 0,
    discountType: "amount",
    total: 0,
    createdAt: 1,
  });

  const emptyStores = {
    tenants: [],
    staff: [],
    catalogGroups: [],
    catalogItems: [],
    tables: [],
    orders: [],
    payments: [],
    shifts: [],
    auditLog: [],
  };
  const json = JSON.stringify({ version: 1, exportedAt: 0, data: emptyStores });

  await withDb(async () => undefined, async (name) => {
    const result = await importDexieBackup({ authenticatedTenantId: tenantId, databaseName: name }, json);
    expect(result).toBe("imported-unusable");
    expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
    expect(useCatalogTableStore.getState().catalogGroups).toEqual([]);
    expect(useCatalogTableStore.getState().tables).toEqual([]);
  });
});

test("import that writes Dexie then hydrate throw still clears stale catalog", async () => {
  useCatalogTableStore.getState().replaceTenantData(tenantId, {
    catalogGroups: [group()],
    catalogItems: [item()],
    tables: [table()],
  });
  const emptyStores = {
    tenants: [],
    staff: [],
    catalogGroups: [],
    catalogItems: [],
    tables: [],
    orders: [],
    payments: [],
    shifts: [],
    auditLog: [],
  };
  const json = JSON.stringify({ version: 1, exportedAt: 0, data: emptyStores });
  const hydrate = await import("./dexie-hydrate");
  const spy = vi.spyOn(hydrate, "hydrateFromDexie").mockRejectedValueOnce(new Error("hydrate-boom"));

  await withDb(async () => undefined, async (name) => {
    const result = await importDexieBackup({ authenticatedTenantId: tenantId, databaseName: name }, json);
    expect(result).toBe("imported-unusable");
    expect(useCatalogTableStore.getState().catalogGroups).toEqual([]);
    expect(useCatalogTableStore.getState().tables).toEqual([]);
  });
  spy.mockRestore();
});
