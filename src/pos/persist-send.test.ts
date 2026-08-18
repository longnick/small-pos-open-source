import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import type { Order, PosTable, Tenant } from "../../packages/pos-core/src/types";
import { PosDatabase } from "../../packages/pos-storage/src/db";
import { persistAfterSend, setDexiePersistSession } from "./dexie-persist";
import { loadOpenOrderForTable, loadRestoredOrderForTable } from "./dexie-restore";
import { useOrderPaymentStore } from "../stores/order-payment-store";

const tenantId = "tenant-demo";

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

const occupiedTable = (): PosTable => ({
  id: "table-1",
  tenantId,
  number: 1,
  status: "occupied",
  openedAt: 0,
  staffId: "staff-1",
  currentOrderId: "order-1",
});

const line = () => ({
  id: "line-1",
  orderId: "order-1",
  catalogItemId: "item-1",
  name: "Cà phê đen",
  price: 25_000,
  quantity: 1,
});

const openOrder = (): Order => ({
  id: "order-1",
  tenantId,
  tableId: "table-1",
  staffId: "staff-1",
  status: "open",
  items: [line()],
  subtotal: 25_000,
  discount: 0,
  discountType: "amount",
  total: 25_000,
  createdAt: 1,
});

const sentOrder = (): Order => ({
  ...openOrder(),
  status: "sent",
  sentAt: 10,
});

async function withDb(seed: (database: PosDatabase) => Promise<void>, run: (name: string) => Promise<void>) {
  const name = `pos-send-persist-${crypto.randomUUID()}`;
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
      orders: await database.orders.toArray(),
      auditLog: await database.auditLog.toArray(),
    };
  } finally {
    database.close();
  }
}

const sendAudit = () => ({
  id: "send:order-1",
  tenantId,
  staffId: "staff-1",
  action: "order.sent",
  entityType: "order",
  entityId: "order-1",
  details: { sentAt: 10 },
  timestamp: 10,
});


beforeEach(() => {
  useOrderPaymentStore.getState().clearCurrentOrder();
  setDexiePersistSession(true);
});

afterEach(() => {
  setDexiePersistSession(false);
  useOrderPaymentStore.getState().clearCurrentOrder();
});

test("persistAfterSend writes the sent order and restore can select it", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    await expect(persistAfterSend(
      { authenticatedTenantId: tenantId, databaseName: name },
      { order: sentOrder(), expectedOpen: openOrder(), audit: sendAudit() },
    )).resolves.toBe(true);
    expect(await readWritten(name)).toEqual({ orders: [sentOrder()], auditLog: [sendAudit()] });

    const restored = await loadOpenOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: name },
      { tableId: "table-1", expectedOrderId: "order-1" },
    );
    expect(restored).toEqual(sentOrder());
    expect(useOrderPaymentStore.getState().selectOpenOrder(restored)).toBe(true);
    expect(useOrderPaymentStore.getState().currentOrder).toMatchObject({
      status: "sent",
      sentAt: 10,
      total: 25_000,
    });
    expect(useOrderPaymentStore.getState().auditEntries).toEqual([]);
  });
});

test("restore loads the durable order.sent audit with the sent order", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(sentOrder());
    await database.auditLog.add(sendAudit());
  }, async (name) => {
    const restored = await loadRestoredOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: name },
      { tableId: "table-1", expectedOrderId: "order-1" },
    );
    expect(restored).toEqual({ order: sentOrder(), audits: [sendAudit()] });
  });
});

test("restore loads order and send audit in one transaction and rejects a sent order without canonical send audit", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(sentOrder());
  }, async (name) => {
    await expect(loadRestoredOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: name },
      { tableId: "table-1", expectedOrderId: "order-1" },
    )).resolves.toBeNull();
  });
});

test("restore rejects a sent order when a related audit is malformed or send details are forged", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(sentOrder());
    await database.auditLog.add({ id: "send:order-1", tenantId, staffId: "staff-1" } as never);
  }, async (name) => {
    await expect(loadRestoredOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: name },
      { tableId: "table-1", expectedOrderId: "order-1" },
    )).resolves.toBeNull();
  });

  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(sentOrder());
    await database.auditLog.add({ ...sendAudit(), details: { sentAt: 99 } });
  }, async (name) => {
    await expect(loadRestoredOrderForTable(
      { authenticatedTenantId: tenantId, databaseName: name },
      { tableId: "table-1", expectedOrderId: "order-1" },
    )).resolves.toBeNull();
  });
});

test("persistAfterSend is idempotent for the same sent snapshot and audit id", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    const input = { authenticatedTenantId: tenantId, databaseName: name };
    const snapshot = { order: sentOrder(), expectedOpen: openOrder(), audit: sendAudit() };
    await expect(persistAfterSend(input, snapshot)).resolves.toBe(true);
    await expect(persistAfterSend(input, snapshot)).resolves.toBe(true);
    expect(await readWritten(name)).toEqual({ orders: [sentOrder()], auditLog: [sendAudit()] });
  });
});

test("persistAfterSend refuses a different sentAt against an already sent order", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(sentOrder());
    await database.auditLog.add(sendAudit());
  }, async (name) => {
    await expect(persistAfterSend(
      { authenticatedTenantId: tenantId, databaseName: name },
      { order: { ...sentOrder(), sentAt: 11 }, expectedOpen: openOrder(), audit: { ...sendAudit(), id: "send:order-1", details: { sentAt: 11 }, timestamp: 11 } },
    )).resolves.toBe(false);
    expect(await readWritten(name)).toEqual({ orders: [sentOrder()], auditLog: [sendAudit()] });
  });
});

test("persistAfterSend refuses when existing open snapshot does not match expectedOpen", async () => {
  const otherOpen = { ...openOrder(), items: [{ ...line(), quantity: 2 }], subtotal: 50_000, total: 50_000 };
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(otherOpen);
  }, async (name) => {
    await expect(persistAfterSend(
      { authenticatedTenantId: tenantId, databaseName: name },
      { order: sentOrder(), expectedOpen: openOrder(), audit: sendAudit() },
    )).resolves.toBe(false);
    expect(await readWritten(name)).toEqual({ orders: [otherOpen], auditLog: [] });
  });
});

test("persistAfterSend refuses when the existing order is already paid", async () => {
  const paid = { ...openOrder(), status: "paid" as const, paidAt: 20 };
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(paid);
  }, async (name) => {
    await expect(persistAfterSend(
      { authenticatedTenantId: tenantId, databaseName: name },
      { order: sentOrder(), expectedOpen: openOrder(), audit: sendAudit() },
    )).resolves.toBe(false);
    expect(await readWritten(name)).toEqual({ orders: [paid], auditLog: [] });
  });
});
