import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import type { Order, Payment, PosTable, Tenant } from "../../packages/pos-core/src/types";
import { PosDatabase } from "../../packages/pos-storage/src/db";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import { useShiftAuditStore } from "../stores/shift-audit-store";
import { useTenantAuthStore } from "../stores/tenant-auth-store";
import { classifyTableOrderBind, loadOpenOrderForTable } from "./dexie-restore";

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

const occupiedTable = (orderId = "order-1"): PosTable => ({
  id: "table-1",
  tenantId,
  number: 1,
  status: "occupied",
  openedAt: 0,
  staffId: "staff-1",
  currentOrderId: orderId,
});

const waitingTable = (orderId = "order-1"): PosTable => ({
  ...occupiedTable(orderId),
  status: "waiting_payment",
});

const emptyTable = (): PosTable => ({
  id: "table-1",
  tenantId,
  number: 1,
  status: "empty",
  openedAt: 0,
  staffId: "staff-1",
});

const line = () => ({
  id: "line-1",
  orderId: "order-1",
  catalogItemId: "item-1",
  name: "Cà phê đen",
  price: 25_000,
  quantity: 1,
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
  const name = `pos-restore-test-${crypto.randomUUID()}`;
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
});

afterEach(() => {
  useCatalogTableStore.getState().clear();
  useOrderPaymentStore.getState().clearCurrentOrder();
  useShiftAuditStore.getState().clear();
});

test("returns the matching open order without writing Dexie or changing stores", async () => {
  const edited = openOrder({ items: [line()], subtotal: 25_000, total: 25_000 });
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(edited);
  }, async (name) => {
    const before = snapshotStores();
    await expect(loadOpenOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: name },
      { tableId: "table-1", expectedOrderId: "order-1" },
    )).resolves.toEqual(edited);
    expect(snapshotStores()).toEqual(before);
    expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
    const written = await readWritten(name);
    expect(written.orders).toEqual([edited]);
    expect(written.tables).toEqual([occupiedTable()]);
    expect(written.payments).toEqual([]);
  });
});

test("returns null for missing order without writing", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
  }, async (name) => {
    const before = snapshotStores();
    await expect(loadOpenOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: name },
      { tableId: "table-1", expectedOrderId: "order-1" },
    )).resolves.toBeNull();
    expect(snapshotStores()).toEqual(before);
    expect((await readWritten(name)).orders).toEqual([]);
  });
});

test("returns null for paid-occupied without hiding the payment", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(paidOrder());
    await database.payments.add(payment());
  }, async (name) => {
    await expect(loadOpenOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: name },
      { tableId: "table-1", expectedOrderId: "order-1" },
    )).resolves.toBeNull();
    const written = await readWritten(name);
    expect(written.orders).toEqual([paidOrder()]);
    expect(written.payments).toEqual([payment()]);
    expect(written.tables).toEqual([occupiedTable()]);
  });
});

test("returns null for table mismatch", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.orders.add(openOrder({ tableId: "table-2" }));
  }, async (name) => {
    await expect(loadOpenOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: name },
      { tableId: "table-1", expectedOrderId: "order-1" },
    )).resolves.toBeNull();
  });
});

test("returns null for tenant mismatch", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.orders.add(openOrder({ tenantId: "other" }));
  }, async (name) => {
    await expect(loadOpenOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: name },
      { tableId: "table-1", expectedOrderId: "order-1" },
    )).resolves.toBeNull();
  });
});

test("returns null when two open orders share the table", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.orders.add(openOrder());
    await database.orders.add(openOrder({ id: "order-2" }));
  }, async (name) => {
    await expect(loadOpenOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: name },
      { tableId: "table-1", expectedOrderId: "order-1" },
    )).resolves.toBeNull();
    expect((await readWritten(name)).orders).toHaveLength(2);
  });
});

test("returns null for Proxy trap snapshots without changing stores", async () => {
  const hostile = new Proxy({} as Order, {
    ownKeys() { throw new Error("trap"); },
    getOwnPropertyDescriptor() { throw new Error("trap"); },
    get() { throw new Error("trap"); },
  });
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.orders.add(openOrder());
  }, async (name) => {
    const orig = PosDatabase.prototype.transaction;
    // @ts-expect-error test stub: hostile snapshot, not a real Dexie transaction
    PosDatabase.prototype.transaction = async () => ({
      order: hostile,
      sameTable: [hostile],
    });
    try {
      const before = snapshotStores();
      await expect(loadOpenOrderForTable(
        { authenticatedTenantId: tenantId, databaseName: name },
        { tableId: "table-1", expectedOrderId: "order-1" },
      )).resolves.toBeNull();
      expect(snapshotStores()).toEqual(before);
      expect((await readWritten(name)).orders).toEqual([openOrder()]);
    } finally {
      PosDatabase.prototype.transaction = orig;
    }
  });
});

test("returns null when Dexie open fails without changing stores", async () => {
  const original = indexedDB.open.bind(indexedDB);
  indexedDB.open = (() => { throw new Error("open fail"); }) as typeof indexedDB.open;
  try {
    const before = snapshotStores();
    await expect(loadOpenOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: "pos-restore-open-fail" },
      { tableId: "table-1", expectedOrderId: "order-1" },
    )).resolves.toBeNull();
    expect(snapshotStores()).toEqual(before);
  } finally {
    indexedDB.open = original;
  }
});

test("classifyTableOrderBind locks bind labels", () => {
  const order = openOrder();
  expect(classifyTableOrderBind(occupiedTable(), order)).toBe("ok");
  expect(classifyTableOrderBind(waitingTable(), order)).toBe("ok");
  expect(classifyTableOrderBind(occupiedTable(), null)).toBe("missing-order");
  expect(classifyTableOrderBind(occupiedTable(), paidOrder())).toBe("paid-occupied");
  expect(classifyTableOrderBind(occupiedTable(), openOrder({ status: "cancelled" }))).toBe("status-mismatch");
  expect(classifyTableOrderBind(emptyTable(), order)).toBe("status-mismatch");
  expect(classifyTableOrderBind(occupiedTable(), openOrder({ tableId: "table-2" }))).toBe("table-mismatch");
  expect(classifyTableOrderBind(occupiedTable(), openOrder({ tenantId: "other" }))).toBe("tenant-mismatch");
  expect(classifyTableOrderBind(occupiedTable(), order, {
    openOrdersForTable: [order, openOrder({ id: "order-2" })],
  })).toBe("duplicate-open");
});
