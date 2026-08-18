import "fake-indexeddb/auto";
import { expect, test } from "vitest";
import { PosDatabase } from "../src/db";
import { exportBackup, importBackup } from "../src/backup";

const v1Stores = [
  "tenants",
  "staff",
  "catalogGroups",
  "catalogItems",
  "tables",
  "orders",
  "payments",
  "shifts",
  "auditLog",
] as const;

const v2Stores = [...v1Stores, "appConfig"] as const;

const pinHash = "v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function createDatabase() {
  return new PosDatabase(`pos-storage-backup-test-${crypto.randomUUID()}`);
}

async function seedViableShop(database: PosDatabase, name: string, tableCount: number) {
  const tenantId = `tenant-${name}`;
  const staffId = `staff-${name}`;
  await database.tenants.add({
    id: tenantId,
    name,
    address: "Chưa cập nhật",
    phone: "0000000000",
    currency: "VND",
    defaultTax: 0,
    defaultSurcharge: 0,
    tableCount,
    createdAt: 1,
  });
  await database.staff.add({
    id: staffId,
    tenantId,
    name: "Chủ quán",
    role: "manager",
    pinHash,
    createdAt: 1,
  });
  await database.appConfig.add({ id: "product", tenantId, completedAt: 1 });
  for (let number = 1; number <= tableCount; number += 1) {
    await database.posTables.add({
      id: `table-${name}-${number}`,
      tenantId,
      number,
      status: "empty",
      openedAt: 0,
      staffId,
    });
  }
}

async function seedOperationalShop(database: PosDatabase, name = "Quán Đủ") {
  await seedViableShop(database, name, 2);
  const tenantId = `tenant-${name}`;
  const staffId = `staff-${name}`;
  const emptyTableId = `table-${name}-1`;
  const occupiedTableId = `table-${name}-2`;
  const groupId = `group-${name}`;
  const itemId = `item-${name}`;
  const openOrderId = `order-open-${name}`;
  const paidOrderId = `order-paid-${name}`;
  const paymentId = `pay-${name}`;
  const shiftId = `shift-${name}`;
  const auditId = `audit-${name}`;
  await database.catalogGroups.add({ id: groupId, tenantId, name: "Nước", sortOrder: 0 });
  await database.catalogItems.add({
    id: itemId,
    tenantId,
    groupId,
    name: "Cà phê",
    price: 25_000,
    available: true,
    sortOrder: 0,
    createdAt: 1,
    updatedAt: 1,
  });
  await database.posTables.put({
    id: occupiedTableId,
    tenantId,
    number: 2,
    status: "occupied",
    openedAt: 10,
    staffId,
    currentOrderId: openOrderId,
  });
  await database.orders.add({
    id: openOrderId,
    tenantId,
    tableId: occupiedTableId,
    staffId,
    status: "open",
    items: [{
      id: `line-open-${name}`,
      orderId: openOrderId,
      catalogItemId: itemId,
      name: "Cà phê",
      price: 25_000,
      quantity: 2,
    }],
    subtotal: 50_000,
    discount: 0,
    discountType: "amount",
    total: 50_000,
    createdAt: 10,
  });
  await database.orders.add({
    id: paidOrderId,
    tenantId,
    tableId: emptyTableId,
    staffId,
    status: "paid",
    items: [{
      id: `line-paid-${name}`,
      orderId: paidOrderId,
      catalogItemId: itemId,
      name: "Cà phê",
      price: 25_000,
      quantity: 1,
    }],
    subtotal: 25_000,
    discount: 0,
    discountType: "amount",
    total: 25_000,
    createdAt: 5,
    paidAt: 8,
  });
  await database.payments.add({
    id: paymentId,
    tenantId,
    orderId: paidOrderId,
    amount: 25_000,
    tender: 30_000,
    method: "cash",
    staffId,
    createdAt: 8,
  });
  await database.shifts.add({
    id: shiftId,
    tenantId,
    staffId,
    openedAt: 1,
    closedAt: 9,
    openingCash: 100_000,
    closingCash: 125_000,
  });
  await database.auditLog.add({
    id: auditId,
    tenantId,
    staffId,
    action: "payment.recorded",
    entityType: "order",
    entityId: paidOrderId,
    details: { paymentId, method: "cash", paidTotal: 25_000 },
    timestamp: 8,
  });
}

async function readAll(database: PosDatabase) {
  return Object.fromEntries(
    await Promise.all(v2Stores.map(async (store) => [store, await database.table(store).toArray()])),
  );
}

async function mutateExport(
  database: PosDatabase,
  mutate: (data: Record<string, unknown[]>) => void,
): Promise<string> {
  const parsed = JSON.parse(await exportBackup(database));
  mutate(parsed.data);
  return JSON.stringify(parsed);
}

test("exports version 2 including appConfig from a first-run shop", async () => {
  const source = createDatabase();
  const target = createDatabase();

  try {
    await source.open();
    await target.open();
    await seedViableShop(source, "Quán Nhà", 2);

    const json = await exportBackup(source);
    const backup = JSON.parse(json);

    expect(Object.keys(backup.data)).toEqual(v2Stores);
    expect(backup.version).toBe(2);
    expect(Number.isFinite(backup.exportedAt)).toBe(true);
    expect(backup.data.appConfig).toHaveLength(1);

    await importBackup(target, json);
    expect(await readAll(target)).toEqual(await readAll(source));
  } finally {
    source.close();
    target.close();
    await source.delete();
    await target.delete();
  }
});

test("rejects a v1 backup before any write", async () => {
  const database = createDatabase();
  const json = JSON.stringify({
    version: 1,
    exportedAt: 0,
    data: Object.fromEntries(v1Stores.map((store, index) => [store, [{ id: `${store}-v1`, value: index }]])),
  });

  try {
    await database.open();
    await seedViableShop(database, "Quán Nhà", 1);
    const before = await readAll(database);
    await expect(importBackup(database, json)).rejects.toThrow("unsupported-for-product-bootstrap");
    expect(await readAll(database)).toEqual(before);
  } finally {
    database.close();
    await database.delete();
  }
});

test("rejects a syntactically valid v2 backup that cannot bootstrap", async () => {
  const database = createDatabase();
  const json = JSON.stringify({
    version: 2,
    exportedAt: 0,
    data: Object.fromEntries(v2Stores.map((store) => [store, []])),
  });

  try {
    await database.open();
    await seedViableShop(database, "Quán Nhà", 1);
    const before = await readAll(database);
    await expect(importBackup(database, json)).rejects.toThrow("backup-not-product-viable");
    expect(await readAll(database)).toEqual(before);
  } finally {
    database.close();
    await database.delete();
  }
});

test.each([
  ["malformed JSON", "{"],
  ["wrong version", JSON.stringify({ version: 3, exportedAt: 0, data: Object.fromEntries(v2Stores.map((store) => [store, []])) })],
  ["missing store", JSON.stringify({ version: 2, exportedAt: 0, data: Object.fromEntries(v2Stores.slice(1).map((store) => [store, []])) })],
  ["unknown store", JSON.stringify({ version: 2, exportedAt: 0, data: { ...Object.fromEntries(v2Stores.map((store) => [store, []])), extra: [] } })],
  ["non-array store", JSON.stringify({ version: 2, exportedAt: 0, data: { ...Object.fromEntries(v2Stores.map((store) => [store, []])), tenants: {} } })],
])("rejects %s without changing database", async (_name, json) => {
  const database = createDatabase();

  try {
    await database.open();
    await seedViableShop(database, "Quán Nhà", 1);
    const before = await readAll(database);

    await expect(importBackup(database, json)).rejects.toThrow(Error);
    expect(await readAll(database)).toEqual(before);
  } finally {
    database.close();
    await database.delete();
  }
});

test.each([
  [
    "catalog group missing sortOrder",
    (data: Record<string, unknown[]>) => {
      data.catalogGroups = [{ id: "g1", tenantId: data.tenants[0] && (data.tenants[0] as { id: string }).id, name: "Nước" }];
    },
  ],
  [
    "table missing status staffId openedAt",
    (data: Record<string, unknown[]>) => {
      const tenantId = (data.tenants[0] as { id: string }).id;
      data.tables = [{ id: "table-bad", tenantId, number: 1 }];
    },
  ],
  [
    "catalog item missing available timestamps",
    (data: Record<string, unknown[]>) => {
      const tenantId = (data.tenants[0] as { id: string }).id;
      data.catalogGroups = [{ id: "g1", tenantId, name: "Nước", sortOrder: 0 }];
      data.catalogItems = [{ id: "i1", tenantId, groupId: "g1", name: "Cà phê", price: 25_000 }];
    },
  ],
  [
    "manager pinHash v1$ only",
    (data: Record<string, unknown[]>) => {
      const staff = { ...(data.staff[0] as Record<string, unknown>), pinHash: "v1$" };
      data.staff = [staff];
    },
  ],
  [
    "manager pinHash wrong salt/key length",
    (data: Record<string, unknown[]>) => {
      const staff = { ...(data.staff[0] as Record<string, unknown>), pinHash: "v1$AA==$AA==" };
      data.staff = [staff];
    },
  ],
])("rejects near-valid %s and leaves all 10 stores unchanged", async (_name, mutate) => {
  const database = createDatabase();
  try {
    await database.open();
    await seedViableShop(database, "Quán Nhà", 1);
    const before = await readAll(database);
    expect(Object.keys(before)).toEqual(v2Stores);
    const json = await mutateExport(database, mutate);
    await expect(importBackup(database, json)).rejects.toThrow("backup-not-product-viable");
    expect(await readAll(database)).toEqual(before);
  } finally {
    database.close();
    await database.delete();
  }
});

test.each([
  [
    "order totals that do not recompute",
    (data: Record<string, unknown[]>) => {
      const order = { ...(data.orders[0] as Record<string, unknown>), total: 1 };
      data.orders = [order, ...data.orders.slice(1)];
    },
  ],
  [
    "payment amount not equal to paid order total",
    (data: Record<string, unknown[]>) => {
      const payment = { ...(data.payments[0] as Record<string, unknown>), amount: 1, tender: 1 };
      data.payments = [payment];
    },
  ],
  [
    "occupied table currentOrderId missing",
    (data: Record<string, unknown[]>) => {
      data.tables = data.tables.map((row) => {
        const table = { ...(row as Record<string, unknown>) };
        if (table.status === "occupied") delete table.currentOrderId;
        return table;
      });
    },
  ],
  [
    "empty table bound to an open order",
    (data: Record<string, unknown[]>) => {
      const open = data.orders.find((row) => (row as { status?: string }).status === "open") as { id: string };
      data.tables = data.tables.map((row) => {
        const table = { ...(row as Record<string, unknown>) };
        if (table.status === "empty") return { ...table, currentOrderId: open.id };
        return table;
      });
    },
  ],
  [
    "shift closedAt before openedAt",
    (data: Record<string, unknown[]>) => {
      const shift = { ...(data.shifts[0] as Record<string, unknown>), closedAt: 0 };
      data.shifts = [shift];
    },
  ],
  [
    "audit details not a plain object",
    (data: Record<string, unknown[]>) => {
      const audit = { ...(data.auditLog[0] as Record<string, unknown>), details: ["not-object"] };
      data.auditLog = [audit];
    },
  ],
  [
    "paidAt before createdAt",
    (data: Record<string, unknown[]>) => {
      data.orders = data.orders.map((row) => {
        const order = { ...(row as Record<string, unknown>) };
        if (order.status === "paid") return { ...order, createdAt: 20, paidAt: 8 };
        return order;
      });
    },
  ],
  [
    "paid order also has cancelledAt",
    (data: Record<string, unknown[]>) => {
      data.orders = data.orders.map((row) => {
        const order = { ...(row as Record<string, unknown>) };
        if (order.status === "paid") return { ...order, cancelledAt: 9 };
        return order;
      });
    },
  ],
])("rejects operational %s and leaves all 10 stores unchanged", async (_name, mutate) => {
  const database = createDatabase();
  try {
    await database.open();
    await seedOperationalShop(database);
    const before = await readAll(database);
    expect(v2Stores.every((store) => (before[store] as unknown[]).length > 0)).toBe(true);
    const json = await mutateExport(database, mutate);
    await expect(importBackup(database, json)).rejects.toThrow("backup-not-product-viable");
    expect(await readAll(database)).toEqual(before);
  } finally {
    database.close();
    await database.delete();
  }
});

test("successful import replaces every store from a nonempty 10-store backup", async () => {
  const source = createDatabase();
  const database = createDatabase();

  try {
    await source.open();
    await database.open();
    await seedOperationalShop(database, "Quán Cũ");
    await seedOperationalShop(source, "Quán Mới");
    const beforeSource = await readAll(source);
    expect(v2Stores.every((store) => (beforeSource[store] as unknown[]).length > 0)).toBe(true);
    const json = await exportBackup(source);
    await importBackup(database, json);
    expect(await readAll(database)).toEqual(beforeSource);
  } finally {
    source.close();
    database.close();
    await source.delete();
    await database.delete();
  }
});

test("imports a legacy payment without tender and a retired catalog SKU snapshot", async () => {
  const source = createDatabase();
  const database = createDatabase();

  try {
    await source.open();
    await database.open();
    await seedOperationalShop(source);
    await seedViableShop(database, "Quán Cũ", 1);
    const json = await mutateExport(source, (data) => {
      const payment = { ...(data.payments[0] as Record<string, unknown>) };
      delete payment.tender;
      data.payments = [payment];
      const order = data.orders.find((row) => (row as { status?: string }).status === "paid") as Record<string, unknown>;
      const items = [...(order.items as unknown[])];
      items[0] = { ...(items[0] as Record<string, unknown>), catalogItemId: "retired-sku" };
      data.orders = data.orders.map((row) => ((row as { id: string }).id === order.id ? { ...order, items } : row));
    });
    await importBackup(database, json);
    const imported = JSON.parse(json).data;
    expect(await readAll(database)).toEqual(imported);
    expect((await database.payments.toArray())[0].tender).toBeUndefined();
    const paid = (await database.orders.toArray()).find((row) => row.status === "paid");
    expect(paid?.items[0].catalogItemId).toBe("retired-sku");
  } finally {
    source.close();
    database.close();
    await source.delete();
    await database.delete();
  }
});
