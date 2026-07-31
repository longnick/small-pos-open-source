import { expect, test } from "vitest";
import { computeShiftReport } from "../src/shift-report";
import type { Order, Payment } from "../src/types";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    tenantId: "tenant-1",
    tableId: "table-1",
    staffId: "staff-1",
    status: "paid",
    items: [],
    subtotal: 0,
    discount: 0,
    discountType: "amount",
    total: 0,
    createdAt: 0,
    ...overrides,
  };
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "payment-1",
    tenantId: "tenant-1",
    orderId: "order-1",
    amount: 0,
    method: "cash",
    staffId: "staff-1",
    createdAt: 0,
    ...overrides,
  };
}

test("returns empty report", () => {
  expect(computeShiftReport([], [])).toEqual({
    totalRevenue: 0,
    totalOrders: 0,
    totalCash: 0,
    totalTransfer: 0,
    totalDiscount: 0,
    topItems: [],
  });
});

test("counts only paid orders and non-cancelled items", () => {
  const paid = order({
    total: 900,
    discount: 100,
    items: [
      { id: "item-1", orderId: "order-1", catalogItemId: "tea", name: "Tea", price: 300, quantity: 3 },
      { id: "item-2", orderId: "order-1", catalogItemId: "cake", name: "Cake", price: 200, quantity: 1, cancelledAt: 1 },
    ],
  });
  const open = order({ id: "order-2", status: "open", total: 700, discount: 50 });
  const cancelled = order({ id: "order-3", status: "cancelled", total: 800, discount: 80 });

  expect(computeShiftReport([paid, open, cancelled], [])).toMatchObject({
    totalRevenue: 900,
    totalOrders: 1,
    totalDiscount: 100,
    topItems: [{ name: "Tea", quantity: 3, revenue: 900 }],
  });
});

test("counts payments from paid orders by method only", () => {
  const orders = [order(), order({ id: "order-2", status: "open" })];
  const payments = [
    payment({ amount: 100, method: "cash" }),
    payment({ id: "payment-2", amount: 200, method: "transfer" }),
    payment({ id: "payment-3", amount: 300, method: "card" }),
    payment({ id: "payment-4", amount: 400, method: "other" }),
    payment({ id: "payment-5", orderId: "order-2", amount: 500, method: "cash" }),
  ];

  expect(computeShiftReport(orders, payments)).toMatchObject({ totalCash: 100, totalTransfer: 200 });
});

test("aggregates stable item identities and sorts by revenue then name", () => {
  const orders = [
    order({
      items: [
        { id: "item-1", orderId: "order-1", catalogItemId: "a", name: "Zebra", price: 100, quantity: 2 },
        { id: "item-2", orderId: "order-1", catalogItemId: "b", name: "Apple", price: 200, quantity: 1 },
      ],
    }),
    order({
      id: "order-2",
      items: [{ id: "item-3", orderId: "order-2", catalogItemId: "a", name: "Renamed Zebra", price: 50, quantity: 2 }],
    }),
  ];

  expect(computeShiftReport(orders, [])).toMatchObject({
    topItems: [
      { name: "Zebra", quantity: 4, revenue: 300 },
      { name: "Apple", quantity: 1, revenue: 200 },
    ],
  });
});

test("rejects malformed numeric inputs", () => {
  for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(() => computeShiftReport([order({ total: value })], [])).toThrow();
    expect(() => computeShiftReport([order({ discount: value })], [])).toThrow();
    expect(() => computeShiftReport([order({ items: [{ id: "item", orderId: "order-1", catalogItemId: "x", name: "X", price: value, quantity: 1 }] })], [])).toThrow();
    expect(() => computeShiftReport([order()], [payment({ amount: value })])).toThrow();
  }
  expect(() => computeShiftReport([order({ items: [{ id: "item", orderId: "order-1", catalogItemId: "x", name: "X", price: 1, quantity: 0 }] })], [])).toThrow(RangeError);
});

test("rejects arithmetic overflow", () => {
  expect(() => computeShiftReport([order({ total: Number.MAX_SAFE_INTEGER }), order({ id: "order-2", total: 1 })], [])).toThrow(RangeError);
  expect(() => computeShiftReport([order({ items: [{ id: "item", orderId: "order-1", catalogItemId: "x", name: "X", price: Number.MAX_SAFE_INTEGER, quantity: 2 }] })], [])).toThrow(RangeError);
  expect(() => computeShiftReport([order()], [payment({ amount: Number.MAX_SAFE_INTEGER }), payment({ id: "payment-2", amount: 1 })])).toThrow(RangeError);
});

test("does not mutate inputs", () => {
  const orders = [order({ total: 100, items: [{ id: "item", orderId: "order-1", catalogItemId: "x", name: "X", price: 100, quantity: 1 }] })];
  const payments = [payment({ amount: 100 })];
  const snapshot = structuredClone({ orders, payments });

  computeShiftReport(orders, payments);

  expect({ orders, payments }).toEqual(snapshot);
});
