import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import type { CatalogGroup, CatalogItem, PosTable, Tenant } from "../../packages/pos-core/src/types";
import { PosDatabase } from "../../packages/pos-storage/src/db";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import { useShiftAuditStore } from "../stores/shift-audit-store";
import { useTenantAuthStore } from "../stores/tenant-auth-store";
import { hydrateFromDexie } from "./dexie-hydrate";

const tenantId = "tenant-demo";

const tenant = (id = tenantId): Tenant => ({
  id,
  name: "Quán Demo",
  address: "123 Đường ABC",
  phone: "0901234567",
  currency: "VND",
  defaultTax: 0,
  defaultSurcharge: 0,
  tableCount: 1,
  createdAt: 0,
});

const group = (id = "group-1"): CatalogGroup => ({
  id,
  tenantId,
  name: "Nước uống",
  sortOrder: 0,
});

const item = (id = "item-1", groupId = "group-1"): CatalogItem => ({
  id,
  tenantId,
  groupId,
  name: "Cà phê đen",
  price: 25_000,
  available: true,
  sortOrder: 0,
  createdAt: 1,
  updatedAt: 1,
});

const table = (id = "table-1", number = 1): PosTable => ({
  id,
  tenantId,
  number,
  status: "empty",
  openedAt: 0,
  staffId: "staff-1",
});

function snapshotStores() {
  const catalog = useCatalogTableStore.getState();
  const order = useOrderPaymentStore.getState();
  const shift = useShiftAuditStore.getState();
  const auth = useTenantAuthStore.getState();
  return structuredClone({
    catalog: {
      tenantId: catalog.tenantId,
      catalogGroups: catalog.catalogGroups,
      catalogItems: catalog.catalogItems,
      tables: catalog.tables,
    },
    order: {
      currentOrder: order.currentOrder,
      payments: order.payments,
      auditEntries: order.auditEntries,
      lastReceipt: order.lastReceipt,
    },
    shift: { currentShift: shift.currentShift, auditEntries: shift.auditEntries },
    auth: { tenant: auth.tenant, staff: auth.staff },
  });
}

async function withDb(seed: (database: PosDatabase) => Promise<void>, run: (name: string) => Promise<void>) {
  const name = `pos-hydrate-test-${crypto.randomUUID()}`;
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
  useShiftAuditStore.getState().clear();
  useTenantAuthStore.setState({ tenant: null, staff: null });
});

afterEach(() => {
  useCatalogTableStore.getState().clear();
  useOrderPaymentStore.getState().clearCurrentOrder();
  useShiftAuditStore.getState().clear();
});

test("returns catalog and tables from a matching Dexie v1 tenant", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.catalogGroups.add(group());
    await database.catalogItems.add(item());
    await database.posTables.add(table());
  }, async (name) => {
    const result = await hydrateFromDexie({ authenticatedTenantId: tenantId, databaseName: name });
    expect(result).toEqual({
      catalogGroups: [group()],
      catalogItems: [item()],
      tables: [table()],
    });
    expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
    expect(useCatalogTableStore.getState().replaceTenantData(tenantId, result!)).toBe(true);
  });
});

test("returns null for empty IDB without changing stores", async () => {
  await withDb(async () => {}, async (name) => {
    const before = snapshotStores();
    await expect(hydrateFromDexie({ authenticatedTenantId: tenantId, databaseName: name })).resolves.toBeNull();
    expect(snapshotStores()).toEqual(before);
  });
});

test("returns null when tenant id does not match auth tenant", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant("other-tenant"));
    await database.catalogGroups.add({ ...group(), tenantId: "other-tenant" });
    await database.catalogItems.add({ ...item(), tenantId: "other-tenant" });
    await database.posTables.add({ ...table(), tenantId: "other-tenant" });
  }, async (name) => {
    const before = snapshotStores();
    await expect(hydrateFromDexie({ authenticatedTenantId: tenantId, databaseName: name })).resolves.toBeNull();
    expect(snapshotStores()).toEqual(before);
  });
});

test("returns null for an invalid catalog row without changing stores", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.catalogGroups.add(group());
    await database.catalogItems.add({ ...item(), name: "" });
    await database.posTables.add(table());
  }, async (name) => {
    const before = snapshotStores();
    await expect(hydrateFromDexie({ authenticatedTenantId: tenantId, databaseName: name })).resolves.toBeNull();
    expect(snapshotStores()).toEqual(before);
  });
});

test("returns null when Dexie open fails without changing stores", async () => {
  const original = indexedDB.open.bind(indexedDB);
  indexedDB.open = (() => { throw new Error("open fail"); }) as typeof indexedDB.open;
  try {
    const before = snapshotStores();
    await expect(hydrateFromDexie({ authenticatedTenantId: tenantId, databaseName: "pos-hydrate-open-fail" })).resolves.toBeNull();
    expect(snapshotStores()).toEqual(before);
  } finally {
    indexedDB.open = original;
  }
});
