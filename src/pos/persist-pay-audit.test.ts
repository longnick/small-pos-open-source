import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import type { AuditEntry, Order, Payment, PosTable, Tenant } from "../../packages/pos-core/src/types";
import { PosDatabase } from "../../packages/pos-storage/src/db";
import { persistAfterPay, setDexiePersistSession } from "./dexie-persist";

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

const emptyTable = (): PosTable => ({
  id: "table-1",
  tenantId,
  number: 1,
  status: "empty",
  openedAt: 0,
  staffId: "staff-1",
});

const occupiedTable = (): PosTable => ({
  ...emptyTable(),
  status: "occupied",
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

const paidOrder = (): Order => ({
  ...openOrder(),
  status: "paid",
  paidAt: 20,
});

const payment = (): Payment => ({
  id: "pay-1",
  tenantId,
  orderId: "order-1",
  amount: 25_000,
  tender: 25_000,
  method: "cash",
  staffId: "staff-1",
  createdAt: 20,
});

const payAudit = (): AuditEntry => ({
  id: "payment:pay-1",
  tenantId,
  staffId: "staff-1",
  action: "payment.recorded",
  entityType: "order",
  entityId: "order-1",
  details: { paymentId: "pay-1", method: "cash", paidTotal: 25_000, tender: 25_000, change: 0 },
  timestamp: 20,
});

async function withDb(seed: (database: PosDatabase) => Promise<void>, run: (name: string) => Promise<void>) {
  const name = `pos-pay-audit-${crypto.randomUUID()}`;
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
      payments: await database.payments.toArray(),
      tables: await database.posTables.toArray(),
      auditLog: await database.auditLog.toArray(),
    };
  } finally {
    database.close();
  }
}

beforeEach(() => {
  setDexiePersistSession(true);
});

afterEach(() => {
  setDexiePersistSession(false);
});

test("persistAfterPay writes payment.recorded audit atomically with the paid order", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    await expect(persistAfterPay(
      { authenticatedTenantId: tenantId, databaseName: name },
      { table: occupiedTable(), order: paidOrder(), payment: payment(), audit: payAudit(), expectedPredecessor: openOrder() },
    )).resolves.toBe(true);
    expect(await readWritten(name)).toEqual({
      orders: [paidOrder()],
      payments: [payment()],
      tables: [occupiedTable()],
      auditLog: [payAudit()],
    });
  });
});

test("persistAfterPay is idempotent for the same payment audit id", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    const input = { authenticatedTenantId: tenantId, databaseName: name };
    const snapshot = { table: occupiedTable(), order: paidOrder(), payment: payment(), audit: payAudit(), expectedPredecessor: openOrder() };
    await expect(persistAfterPay(input, snapshot)).resolves.toBe(true);
    await expect(persistAfterPay(input, snapshot)).resolves.toBe(true);
    expect((await readWritten(name)).auditLog).toEqual([payAudit()]);
    expect((await readWritten(name)).payments).toEqual([payment()]);
  });
});

test("persistAfterPay rejects missing audit without write", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    await expect(persistAfterPay(
      { authenticatedTenantId: tenantId, databaseName: name },
      { table: occupiedTable(), order: paidOrder(), payment: payment(), expectedPredecessor: openOrder() } as never,
    )).resolves.toBe(false);
    expect(await readWritten(name)).toEqual({
      orders: [openOrder()],
      payments: [],
      tables: [occupiedTable()],
      auditLog: [],
    });
  });
});

test("persistAfterPay refuses a different payload for the same payment id", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    const input = { authenticatedTenantId: tenantId, databaseName: name };
    await expect(persistAfterPay(input, {
      table: occupiedTable(), order: paidOrder(), payment: payment(), audit: payAudit(), expectedPredecessor: openOrder(),
    })).resolves.toBe(true);
    await expect(persistAfterPay(input, {
      table: occupiedTable(),
      order: paidOrder(),
      payment: { ...payment(), tender: 30_000 },
      audit: { ...payAudit(), details: { ...payAudit().details, tender: 30_000, change: 5_000 } },
      expectedPredecessor: openOrder(),
    })).resolves.toBe(false);
    expect((await readWritten(name)).payments).toEqual([payment()]);
    expect((await readWritten(name)).auditLog).toEqual([payAudit()]);
  });
});

test("persistAfterPay first payment wins against a second payment id", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    const input = { authenticatedTenantId: tenantId, databaseName: name };
    await expect(persistAfterPay(input, {
      table: occupiedTable(), order: paidOrder(), payment: payment(), audit: payAudit(), expectedPredecessor: openOrder(),
    })).resolves.toBe(true);
    await expect(persistAfterPay(input, {
      table: occupiedTable(),
      order: { ...paidOrder(), paidAt: 21 },
      payment: { ...payment(), id: "pay-2", createdAt: 21 },
      audit: { ...payAudit(), id: "payment:pay-2", details: { ...payAudit().details, paymentId: "pay-2" }, timestamp: 21 },
      expectedPredecessor: openOrder(),
    })).resolves.toBe(false);
    expect((await readWritten(name)).payments.map((row) => row.id)).toEqual(["pay-1"]);
  });
});

test("persistAfterPay refuses when durable order is already paid with a different payment", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(paidOrder());
    await database.payments.add(payment());
    await database.auditLog.add(payAudit());
  }, async (name) => {
    await expect(persistAfterPay(
      { authenticatedTenantId: tenantId, databaseName: name },
      {
        table: occupiedTable(),
        order: { ...paidOrder(), paidAt: 30 },
        payment: { ...payment(), id: "pay-2", createdAt: 30 },
        audit: { ...payAudit(), id: "payment:pay-2", details: { ...payAudit().details, paymentId: "pay-2" }, timestamp: 30 },
        expectedPredecessor: openOrder(),
      },
    )).resolves.toBe(false);
    expect((await readWritten(name)).payments.map((row) => row.id)).toEqual(["pay-1"]);
  });
});

test("persistAfterPay refuses when expectedPredecessor does not match durable open snapshot", async () => {
  const otherOpen = { ...openOrder(), items: [{ ...line(), quantity: 2 }], subtotal: 50_000, total: 50_000 };
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(otherOpen);
  }, async (name) => {
    await expect(persistAfterPay(
      { authenticatedTenantId: tenantId, databaseName: name },
      { table: occupiedTable(), order: paidOrder(), payment: payment(), audit: payAudit(), expectedPredecessor: openOrder() },
    )).resolves.toBe(false);
    expect(await readWritten(name)).toEqual({
      orders: [otherOpen],
      payments: [],
      tables: [occupiedTable()],
      auditLog: [],
    });
  });
});

test("two connections: first payment id wins, second different id is rejected", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    const input = { authenticatedTenantId: tenantId, databaseName: name };
    const first = persistAfterPay(input, {
      table: occupiedTable(), order: paidOrder(), payment: payment(), audit: payAudit(), expectedPredecessor: openOrder(),
    });
    const second = persistAfterPay(input, {
      table: occupiedTable(),
      order: { ...paidOrder(), paidAt: 21 },
      payment: { ...payment(), id: "pay-2", createdAt: 21 },
      audit: { ...payAudit(), id: "payment:pay-2", details: { ...payAudit().details, paymentId: "pay-2" }, timestamp: 21 },
      expectedPredecessor: openOrder(),
    });
    const results = await Promise.all([first, second]);
    expect(results.filter((ok) => ok === true)).toHaveLength(1);
    expect(results.filter((ok) => ok === false)).toHaveLength(1);
    expect((await readWritten(name)).payments).toHaveLength(1);
    expect((await readWritten(name)).auditLog).toHaveLength(1);
  });
});
