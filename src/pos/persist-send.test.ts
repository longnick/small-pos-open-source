import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import type { Order, PosTable, Tenant } from "../../packages/pos-core/src/types";
import { PosDatabase } from "../../packages/pos-storage/src/db";
import { persistAfterSend, setDexiePersistSession } from "./dexie-persist";
import { loadOpenOrderForTable } from "./dexie-restore";
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

async function readOrders(name: string) {
  const database = new PosDatabase(name);
  try {
    await database.open();
    return database.orders.toArray();
  } finally {
    database.close();
  }
}

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
      { order: sentOrder() },
    )).resolves.toBe(true);
    expect(await readOrders(name)).toEqual([sentOrder()]);

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
  });
});
