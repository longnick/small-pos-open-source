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
      { table: emptyTable(), order: paidOrder(), payment: payment(), audit: payAudit() },
    )).resolves.toBe(true);
    expect(await readWritten(name)).toEqual({
      orders: [paidOrder()],
      payments: [payment()],
      tables: [emptyTable()],
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
    const snapshot = { table: emptyTable(), order: paidOrder(), payment: payment(), audit: payAudit() };
    await expect(persistAfterPay(input, snapshot)).resolves.toBe(true);
    await expect(persistAfterPay(input, snapshot)).resolves.toBe(true);
    expect((await readWritten(name)).auditLog).toEqual([payAudit()]);
  });
});
