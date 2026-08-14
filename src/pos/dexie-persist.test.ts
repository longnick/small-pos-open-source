import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import type { CatalogGroup, CatalogItem, Order, Payment, PosTable, Tenant } from "../../packages/pos-core/src/types";
import { PosDatabase } from "../../packages/pos-storage/src/db";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import { useShiftAuditStore } from "../stores/shift-audit-store";
import { useTenantAuthStore } from "../stores/tenant-auth-store";
import {
  persistAfterOccupy,
  persistAfterOrderEdit,
  persistAfterPay,
  setDexiePersistSession,
} from "./dexie-persist";

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

const emptyTable = (): PosTable => ({
  id: "table-1",
  tenantId,
  number: 1,
  status: "empty",
  openedAt: 0,
  staffId: "staff-1",
});

const occupiedTable = (orderId = "order-1"): PosTable => ({
  ...emptyTable(),
  status: "occupied",
  currentOrderId: orderId,
});

const openOrder = (overrides: Partial<Order> = {}): Order => ({
  id: "order-1",
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
  ...overrides,
});

const line = () => ({
  id: "line-1",
  orderId: "order-1",
  catalogItemId: "item-1",
  name: "Cà phê đen",
  price: 25_000,
  quantity: 1,
});

const paidOrder = (): Order => ({
  ...openOrder({ items: [line()], subtotal: 25_000, total: 25_000 }),
  status: "paid",
  paidAt: 9,
});

const payment = (): Payment => ({
  id: "pay-1",
  tenantId,
  orderId: "order-1",
  amount: 25_000,
  tender: 25_000,
  method: "cash",
  staffId: "staff-1",
  createdAt: 9,
});

function snapshotStores() {
  const catalog = useCatalogTableStore.getState();
  const order = useOrderPaymentStore.getState();
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
    shift: { currentShift: useShiftAuditStore.getState().currentShift },
    auth: { tenant: useTenantAuthStore.getState().tenant },
  });
}

async function withDb(seed: (database: PosDatabase) => Promise<void>, run: (name: string) => Promise<void>) {
  const name = `pos-persist-test-${crypto.randomUUID()}`;
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

async function readWritten(name: string) {
  const database = new PosDatabase(name);
  try {
    await database.open();
    return {
      tables: await database.posTables.toArray(),
      orders: await database.orders.toArray(),
      payments: await database.payments.toArray(),
      tenants: await database.tenants.toArray(),
      catalogItems: await database.catalogItems.toArray(),
    };
  } finally {
    database.close();
  }
}

beforeEach(() => {
  useCatalogTableStore.getState().clear();
  useOrderPaymentStore.getState().clearCurrentOrder();
  useShiftAuditStore.getState().clear();
  useTenantAuthStore.setState({ tenant: null, staff: null });
  setDexiePersistSession(true);
});

afterEach(() => {
  setDexiePersistSession(false);
  useCatalogTableStore.getState().clear();
  useOrderPaymentStore.getState().clearCurrentOrder();
  useShiftAuditStore.getState().clear();
});

test("occupy writes occupied table and open order in one transaction", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.catalogGroups.add(group());
    await database.catalogItems.add(item());
    await database.posTables.add(emptyTable());
  }, async (name) => {
    const before = snapshotStores();
    await expect(persistAfterOccupy(
      { authenticatedTenantId: tenantId, databaseName: name },
      { table: occupiedTable(), order: openOrder() },
    )).resolves.toBe(true);
    expect(snapshotStores()).toEqual(before);
    const written = await readWritten(name);
    expect(written.tables).toEqual([occupiedTable()]);
    expect(written.orders).toEqual([openOrder()]);
    expect(written.payments).toEqual([]);
    expect(written.tenants).toEqual([tenant()]);
    expect(written.catalogItems).toEqual([item()]);
  });
});

test("order edit puts the full order document and leaves tables/payments alone", async () => {
  const edited = openOrder({ items: [line()], subtotal: 25_000, total: 25_000 });
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    await expect(persistAfterOrderEdit(
      { authenticatedTenantId: tenantId, databaseName: name },
      { order: edited },
    )).resolves.toBe(true);
    const written = await readWritten(name);
    expect(written.orders).toEqual([edited]);
    expect(written.tables).toEqual([occupiedTable()]);
    expect(written.payments).toEqual([]);
  });
});

test("pay writes paid order, payment, and empty table together", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder({ items: [line()], subtotal: 25_000, total: 25_000 }));
  }, async (name) => {
    await expect(persistAfterPay(
      { authenticatedTenantId: tenantId, databaseName: name },
      { table: emptyTable(), order: paidOrder(), payment: payment() },
    )).resolves.toBe(true);
    const written = await readWritten(name);
    expect(written.orders).toEqual([paidOrder()]);
    expect(written.payments).toEqual([payment()]);
    expect(written.tables).toEqual([emptyTable()]);
  });
});

test("pay persists occupied+paid split when release failed", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder({ items: [line()], subtotal: 25_000, total: 25_000 }));
  }, async (name) => {
    await expect(persistAfterPay(
      { authenticatedTenantId: tenantId, databaseName: name },
      { table: occupiedTable(), order: paidOrder(), payment: payment() },
    )).resolves.toBe(true);
    const written = await readWritten(name);
    expect(written.orders).toEqual([paidOrder()]);
    expect(written.payments).toEqual([payment()]);
    expect(written.tables).toEqual([occupiedTable()]);
  });
});

test("returns false without writing when persist session is off", async () => {
  setDexiePersistSession(false);
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(emptyTable());
  }, async (name) => {
    await expect(persistAfterOccupy(
      { authenticatedTenantId: tenantId, databaseName: name },
      { table: occupiedTable(), order: openOrder() },
    )).resolves.toBe(false);
    const written = await readWritten(name);
    expect(written.orders).toEqual([]);
    expect(written.tables).toEqual([emptyTable()]);
  });
});

test("returns false on tenant mismatch without changing stores or IDB orders", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(emptyTable());
  }, async (name) => {
    const before = snapshotStores();
    await expect(persistAfterOccupy(
      { authenticatedTenantId: tenantId, databaseName: name },
      { table: { ...occupiedTable(), tenantId: "other" }, order: openOrder() },
    )).resolves.toBe(false);
    expect(snapshotStores()).toEqual(before);
    expect((await readWritten(name)).orders).toEqual([]);
  });
});

test("returns false for Proxy trap snapshots without writing or changing stores", async () => {
  const hostile = new Proxy({} as Order, {
    ownKeys() { throw new Error("trap"); },
    getOwnPropertyDescriptor() { throw new Error("trap"); },
    get() { throw new Error("trap"); },
  });
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(emptyTable());
  }, async (name) => {
    const before = snapshotStores();
    await expect(persistAfterOccupy(
      { authenticatedTenantId: tenantId, databaseName: name },
      { table: occupiedTable(), order: hostile },
    )).resolves.toBe(false);
    expect(snapshotStores()).toEqual(before);
    expect((await readWritten(name)).orders).toEqual([]);
  });
});

test("returns false for hostile accessor snapshots without writing", async () => {
  const hostile = {
    get id() { return "order-1"; },
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
  } as Order;
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(emptyTable());
  }, async (name) => {
    await expect(persistAfterOccupy(
      { authenticatedTenantId: tenantId, databaseName: name },
      { table: occupiedTable(), order: hostile },
    )).resolves.toBe(false);
    expect((await readWritten(name)).orders).toEqual([]);
  });
});

test("returns false when Dexie open fails without changing stores", async () => {
  const original = indexedDB.open.bind(indexedDB);
  indexedDB.open = (() => { throw new Error("open fail"); }) as typeof indexedDB.open;
  try {
    const before = snapshotStores();
    await expect(persistAfterOccupy(
      { authenticatedTenantId: tenantId, databaseName: "pos-persist-open-fail" },
      { table: occupiedTable(), order: openOrder() },
    )).resolves.toBe(false);
    expect(snapshotStores()).toEqual(before);
  } finally {
    indexedDB.open = original;
  }
});
