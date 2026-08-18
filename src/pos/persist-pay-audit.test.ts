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
    )).resolves.toEqual({ kind: "committed" });
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
    await expect(persistAfterPay(input, snapshot)).resolves.toEqual({ kind: "committed" });
    await expect(persistAfterPay(input, snapshot)).resolves.toEqual({ kind: "idempotent" });
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
    )).resolves.toEqual({ kind: "invalid" });
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
    })).resolves.toEqual({ kind: "committed" });
    await expect(persistAfterPay(input, {
      table: occupiedTable(),
      order: paidOrder(),
      payment: { ...payment(), tender: 30_000 },
      audit: { ...payAudit(), details: { ...payAudit().details, tender: 30_000, change: 5_000 } },
      expectedPredecessor: openOrder(),
    })).resolves.toEqual({ kind: "conflict" });
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
    })).resolves.toEqual({ kind: "committed" });
    await expect(persistAfterPay(input, {
      table: occupiedTable(),
      order: { ...paidOrder(), paidAt: 21 },
      payment: { ...payment(), id: "pay-2", createdAt: 21 },
      audit: { ...payAudit(), id: "payment:pay-2", details: { ...payAudit().details, paymentId: "pay-2" }, timestamp: 21 },
      expectedPredecessor: openOrder(),
    })).resolves.toEqual({ kind: "conflict" });
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
    )).resolves.toEqual({ kind: "conflict" });
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
    )).resolves.toEqual({ kind: "conflict" });
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
    expect(results.map((row) => row.kind).sort()).toEqual(["committed", "conflict"]);
    expect((await readWritten(name)).payments).toHaveLength(1);
    expect((await readWritten(name)).auditLog).toHaveLength(1);
  });
});

test("persistAfterPay rejects underpaid cash, over-tender noncash, and overflow tender", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    const input = { authenticatedTenantId: tenantId, databaseName: name };
    await expect(persistAfterPay(input, {
      table: occupiedTable(),
      order: paidOrder(),
      payment: { ...payment(), tender: 24_999 },
      audit: { ...payAudit(), details: { ...payAudit().details, tender: 24_999, change: -1 } },
      expectedPredecessor: openOrder(),
    })).resolves.toEqual({ kind: "invalid" });
    await expect(persistAfterPay(input, {
      table: occupiedTable(),
      order: paidOrder(),
      payment: { ...payment(), method: "card", tender: 30_000 },
      audit: { ...payAudit(), details: { ...payAudit().details, method: "card", tender: 30_000, change: 5_000 } },
      expectedPredecessor: openOrder(),
    })).resolves.toEqual({ kind: "invalid" });
    await expect(persistAfterPay(input, {
      table: occupiedTable(),
      order: paidOrder(),
      payment: { ...payment(), tender: Number.MAX_SAFE_INTEGER + 1 },
      audit: { ...payAudit(), details: { ...payAudit().details, tender: Number.MAX_SAFE_INTEGER + 1, change: Number.MAX_SAFE_INTEGER + 1 - 25_000 } },
      expectedPredecessor: openOrder(),
    })).resolves.toEqual({ kind: "invalid" });
    expect(await readWritten(name)).toEqual({
      orders: [openOrder()],
      payments: [],
      tables: [occupiedTable()],
      auditLog: [],
    });
  });
});

test("persistAfterPay idempotent retry conflicts when table payload mismatches and does not rewrite table", async () => {
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    const input = { authenticatedTenantId: tenantId, databaseName: name };
    await expect(persistAfterPay(input, {
      table: emptyTable(), order: paidOrder(), payment: payment(), audit: payAudit(), expectedPredecessor: openOrder(),
    })).resolves.toEqual({ kind: "committed" });
    expect((await readWritten(name)).tables).toEqual([emptyTable()]);
    await expect(persistAfterPay(input, {
      table: occupiedTable(), order: paidOrder(), payment: payment(), audit: payAudit(), expectedPredecessor: openOrder(),
    })).resolves.toEqual({ kind: "conflict" });
    expect((await readWritten(name)).tables).toEqual([emptyTable()]);
    await expect(persistAfterPay(input, {
      table: emptyTable(), order: paidOrder(), payment: payment(), audit: payAudit(), expectedPredecessor: openOrder(),
    })).resolves.toEqual({ kind: "idempotent" });
    expect((await readWritten(name)).tables).toEqual([emptyTable()]);
  });
});

test("two connections: loser reconciles local memory to durable paid/empty", async () => {
  const { useCatalogTableStore } = await import("../stores/catalog-table-store");
  const { useOrderPaymentStore } = await import("../stores/order-payment-store");
  const { useTenantAuthStore } = await import("../stores/tenant-auth-store");
  const { reconcileLocalPayFromDurable } = await import("./reconcile-pay");
  await withDb(async (database) => {
    await database.tenants.add(tenant());
    await database.posTables.add(occupiedTable());
    await database.orders.add(openOrder());
  }, async (name) => {
    const input = { authenticatedTenantId: tenantId, databaseName: name };
    const first = persistAfterPay(input, {
      table: emptyTable(), order: paidOrder(), payment: payment(), audit: payAudit(), expectedPredecessor: openOrder(),
    });
    const secondPay = { ...payment(), id: "pay-2", createdAt: 21 };
    const secondAudit = { ...payAudit(), id: "payment:pay-2", details: { ...payAudit().details, paymentId: "pay-2" }, timestamp: 21 };
    const second = persistAfterPay(input, {
      table: emptyTable(),
      order: { ...paidOrder(), paidAt: 21 },
      payment: secondPay,
      audit: secondAudit,
      expectedPredecessor: openOrder(),
    });
    const results = await Promise.all([first, second]);
    expect(results.map((row) => row.kind).sort()).toEqual(["committed", "conflict"]);
    const { loadDurablePaySnapshot } = await import("./dexie-persist");
    const durable = await loadDurablePaySnapshot(input, { tableId: "table-1", orderId: "order-1" });
    expect(durable?.payments).toEqual([payment()]);
    expect(durable?.table.status).toBe("empty");

    useTenantAuthStore.setState({
      tenant: null,
      staff: { id: "staff-1", tenantId, name: "Cashier", role: "cashier", pinHash: "v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", createdAt: 0 },
    });
    useCatalogTableStore.setState({ tenantId, catalogGroups: [], catalogItems: [], tables: [occupiedTable()] });
    useOrderPaymentStore.getState().clearCurrentOrder();
    useOrderPaymentStore.setState({ payments: Object.freeze([]) as never, auditEntries: [], lastReceipt: null });
    useOrderPaymentStore.getState().selectOpenOrder(openOrder());
    expect(useOrderPaymentStore.getState().recordPayment(secondPay)).toBe(true);
    expect(reconcileLocalPayFromDurable(durable!, { localPaymentId: "pay-2", predecessor: openOrder() })).toBe("winner");
    expect(useOrderPaymentStore.getState().payments.map((row) => row.id)).toEqual(["pay-1"]);
    expect(useCatalogTableStore.getState().tableById("table-1")?.status).toBe("empty");
    expect(useOrderPaymentStore.getState().recordPayment({ ...secondPay, id: "pay-3", createdAt: 22 })).toBe(false);
  });
});
