import { beforeEach, expect, test } from "vitest";
import type { Order, Payment } from "../../packages/pos-core/src/types";
import { useOrderPaymentStore } from "./order-payment-store";

const order = (): Order => ({
  id: "order-1",
  tenantId: "tenant-1",
  tableId: "table-1",
  staffId: "staff-1",
  status: "open",
  items: [],
  subtotal: 0,
  discount: 0,
  discountType: "amount",
  total: 0,
  createdAt: 1,
});

beforeEach(() => {
  useOrderPaymentStore.getState().clearCurrentOrder();
  useOrderPaymentStore.setState({ payments: Object.freeze([]) as unknown as Payment[] });
});

test("selects valid open order without retaining caller record", () => {
  const candidate = order();

  expect(useOrderPaymentStore.getState().selectOpenOrder(candidate)).toBe(true);
  candidate.status = "paid";

  expect(useOrderPaymentStore.getState().currentOrder).toEqual(order());
});

test("drops unknown nested fields from accepted order, item, and payment input", () => {
  const orderExtra = { nested: { value: "order" } };
  const itemExtra = { nested: { value: "item" } };
  const orderCandidate = {
    ...order(),
    extra: orderExtra,
    items: [{ id: "line-input", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 10_000, quantity: 1, extra: itemExtra }],
    subtotal: 10_000,
    total: 10_000,
  };

  expect(useOrderPaymentStore.getState().selectOpenOrder(orderCandidate)).toBe(true);
  orderExtra.nested.value = "changed";
  itemExtra.nested.value = "changed";
  expect(useOrderPaymentStore.getState().currentOrder).not.toHaveProperty("extra");
  expect(useOrderPaymentStore.getState().currentOrder!.items[0]).not.toHaveProperty("extra");

  const addedExtra = { nested: { value: "added" } };
  expect(useOrderPaymentStore.getState().addItem({ id: "line-added", orderId: "order-1", catalogItemId: "tea", name: "Tea", price: 5_000, quantity: 1, extra: addedExtra })).toBe(true);
  addedExtra.nested.value = "changed";
  expect(useOrderPaymentStore.getState().currentOrder!.items[1]).not.toHaveProperty("extra");

  const paymentExtra = { nested: { value: "payment" } };
  expect(useOrderPaymentStore.getState().recordPayment({ id: "payment-extra", tenantId: "tenant-1", orderId: "order-1", amount: 15_000, method: "cash", staffId: "staff-1", createdAt: 2, extra: paymentExtra })).toBe(true);
  paymentExtra.nested.value = "changed";
  expect(useOrderPaymentStore.getState().payments[0]).not.toHaveProperty("extra");
});

test("creates valid current open order", () => {
  expect(useOrderPaymentStore.getState().createOpenOrder(order())).toBe(true);
  expect(useOrderPaymentStore.getState().currentOrder).toEqual(order());
});

test("selectOpenOrder rejects amount discount order with discountPercent", () => {
  expect(useOrderPaymentStore.getState().selectOpenOrder({ ...order(), discountPercent: 0 })).toBe(false);
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
});

test("prevents external mutation of stored orders and payments", () => {
  useOrderPaymentStore.getState().selectOpenOrder({ ...order(), items: [{ id: "line-immutable", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 10_000, quantity: 1 }], subtotal: 10_000, total: 10_000 });
  const storedOrder = useOrderPaymentStore.getState().currentOrder!;
  expect(() => { storedOrder.items[0].quantity = 99; }).toThrow();
  expect(useOrderPaymentStore.getState().currentOrder).toMatchObject({ items: [{ quantity: 1 }], subtotal: 10_000, total: 10_000 });

  const payment: Payment = { id: "payment-immutable", tenantId: "tenant-1", orderId: "order-1", amount: 10_000, method: "cash", staffId: "staff-1", createdAt: 2 };
  expect(useOrderPaymentStore.getState().recordPayment(payment)).toBe(true);
  const storedPayments = useOrderPaymentStore.getState().payments;
  expect(() => { storedPayments[0].amount = 1; }).toThrow();
  expect(() => { storedPayments.push(payment); }).toThrow();
  expect(useOrderPaymentStore.getState().payments).toMatchObject([{ amount: 10_000 }]);
});

test("adds, updates, and removes valid items with recalculated totals", () => {
  useOrderPaymentStore.getState().selectOpenOrder(order());
  const item = { id: "line-1", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 30_000, quantity: 2 };

  expect(useOrderPaymentStore.getState().addItem(item)).toBe(true);
  expect(useOrderPaymentStore.getState().updateItemQuantity("line-1", 3)).toBe(true);
  expect(useOrderPaymentStore.getState().setDiscount("percent", 10)).toBe(true);
  expect(useOrderPaymentStore.getState().currentOrder).toMatchObject({ subtotal: 90_000, discount: 9_000, total: 81_000, discountPercent: 10 });
  expect(useOrderPaymentStore.getState().setDiscount("amount", 5_000)).toBe(true);
  expect(useOrderPaymentStore.getState().currentOrder).toMatchObject({ discountType: "amount", discount: 5_000 });
  expect(useOrderPaymentStore.getState().currentOrder).not.toHaveProperty("discountPercent");
  expect(useOrderPaymentStore.getState().removeItem("line-1")).toBe(true);
  expect(useOrderPaymentStore.getState().currentOrder).toMatchObject({ items: [], subtotal: 0, discount: 0, total: 0 });
});

test("records valid payment only when amount covers order total", () => {
  useOrderPaymentStore.getState().selectOpenOrder({ ...order(), items: [{ id: "line-1", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 50_000, quantity: 1 }], subtotal: 50_000, discount: 0, total: 50_000 });
  const payment: Payment = { id: "payment-1", tenantId: "tenant-1", orderId: "order-1", amount: 50_000, method: "cash", staffId: "staff-1", createdAt: 2 };

  expect(useOrderPaymentStore.getState().recordPayment(payment)).toBe(true);
  expect(useOrderPaymentStore.getState()).toMatchObject({ currentOrder: { status: "paid", paidAt: 2 }, payments: [payment] });
  expect(useOrderPaymentStore.getState().setDiscount("amount", 1)).toBe(false);
});

test("rejects second valid unique payment after current order is paid without state change", () => {
  useOrderPaymentStore.getState().selectOpenOrder({ ...order(), items: [{ id: "line-1", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 50_000, quantity: 1 }], subtotal: 50_000, discount: 0, total: 50_000 });
  const first: Payment = { id: "payment-first", tenantId: "tenant-1", orderId: "order-1", amount: 50_000, method: "cash", staffId: "staff-1", createdAt: 2 };
  const second: Payment = { ...first, id: "payment-second", createdAt: 3 };

  expect(useOrderPaymentStore.getState().recordPayment(first)).toBe(true);
  const afterFirst = structuredClone({
    currentOrder: useOrderPaymentStore.getState().currentOrder,
    payments: useOrderPaymentStore.getState().payments,
  });

  expect(useOrderPaymentStore.getState().recordPayment(second)).toBe(false);
  expect({ currentOrder: useOrderPaymentStore.getState().currentOrder, payments: useOrderPaymentStore.getState().payments }).toEqual(afterFirst);
});

test("rejects malformed totals, invalid mutations, and underpayment without state change", () => {
  expect(useOrderPaymentStore.getState().selectOpenOrder({ ...order(), subtotal: 1, total: 1 })).toBe(false);
  useOrderPaymentStore.getState().selectOpenOrder({ ...order(), items: [{ id: "line-1", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 10_000, quantity: 1 }], subtotal: 10_000, total: 10_000 });
  const before = structuredClone(useOrderPaymentStore.getState().currentOrder);

  expect(useOrderPaymentStore.getState().addItem({ id: "bad", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 1.5, quantity: 1 })).toBe(false);
  expect(useOrderPaymentStore.getState().updateItemQuantity("missing", 0)).toBe(false);
  expect(useOrderPaymentStore.getState().setDiscount("percent", 101)).toBe(false);
  expect(useOrderPaymentStore.getState().recordPayment({ id: "short", tenantId: "tenant-1", orderId: "order-1", amount: 9_999, method: "cash", staffId: "staff-1", createdAt: 2 })).toBe(false);
  expect(useOrderPaymentStore.getState().currentOrder).toEqual(before);
});

const accessorRecord = <T extends object>(record: T, key: keyof T): T => {
  const value = record[key];
  Object.defineProperty(record, key, { enumerable: true, get: () => value });
  return record;
};

test("selectOpenOrder rejects changing accessor order records without state change", () => {
  const candidate = order();
  let reads = 0;
  Object.defineProperty(candidate, "status", { enumerable: true, get: () => ++reads === 1 ? "open" : "paid" });

  expect(() => expect(useOrderPaymentStore.getState().selectOpenOrder(candidate)).toBe(false)).not.toThrow();
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
});

test("selectOpenOrder rejects throwing accessor order records without state change", () => {
  const candidate = order();
  Object.defineProperty(candidate, "status", { enumerable: true, get: () => { throw new Error("hostile accessor"); } });

  expect(() => expect(useOrderPaymentStore.getState().selectOpenOrder(candidate)).toBe(false)).not.toThrow();
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
});

test("selectOpenOrder rejects hostile Proxy records without state change", () => {
  const candidate = new Proxy(order(), { getPrototypeOf: () => { throw new Error("hostile proxy"); } });

  expect(() => expect(useOrderPaymentStore.getState().selectOpenOrder(candidate)).toBe(false)).not.toThrow();
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
});

test.each([
  ["sentAt", { nested: "timestamp" }],
  ["paidAt", { nested: "timestamp" }],
  ["cancelledAt", { nested: "timestamp" }],
  ["sentAt", 2],
  ["paidAt", 2],
  ["cancelledAt", 2],
])("selectOpenOrder rejects lifecycle field %s on open order", (field, value) => {
  expect(useOrderPaymentStore.getState().selectOpenOrder({ ...order(), [field]: value })).toBe(false);
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
});

test("addItem rejects accessor item records without state change", () => {
  useOrderPaymentStore.getState().selectOpenOrder(order());
  const before = structuredClone(useOrderPaymentStore.getState().currentOrder);
  const item = accessorRecord({ id: "line-1", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 10_000, quantity: 1 }, "name");

  expect(() => expect(useOrderPaymentStore.getState().addItem(item)).toBe(false)).not.toThrow();
  expect(useOrderPaymentStore.getState().currentOrder).toEqual(before);
});

test("addItem rejects hostile Proxy records without state change", () => {
  useOrderPaymentStore.getState().selectOpenOrder(order());
  const before = structuredClone(useOrderPaymentStore.getState().currentOrder);
  const item = new Proxy({ id: "line-proxy", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 10_000, quantity: 1 }, { getPrototypeOf: () => { throw new Error("hostile proxy"); } });

  expect(() => expect(useOrderPaymentStore.getState().addItem(item)).toBe(false)).not.toThrow();
  expect(useOrderPaymentStore.getState().currentOrder).toEqual(before);
});

test("recordPayment rejects accessor payment records without state change", () => {
  useOrderPaymentStore.getState().selectOpenOrder({ ...order(), items: [{ id: "line-payment", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 10_000, quantity: 1 }], subtotal: 10_000, total: 10_000 });
  const before = structuredClone({ currentOrder: useOrderPaymentStore.getState().currentOrder, payments: useOrderPaymentStore.getState().payments });
  const payment = accessorRecord({ id: "payment-accessor", tenantId: "tenant-1", orderId: "order-1", amount: 10_000, method: "cash", staffId: "staff-1", createdAt: 2 }, "method");

  expect(() => expect(useOrderPaymentStore.getState().recordPayment(payment)).toBe(false)).not.toThrow();
  expect({ currentOrder: useOrderPaymentStore.getState().currentOrder, payments: useOrderPaymentStore.getState().payments }).toEqual(before);
});

test("recordPayment rejects hostile Proxy records without state change", () => {
  useOrderPaymentStore.getState().selectOpenOrder({ ...order(), items: [{ id: "line-payment", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 10_000, quantity: 1 }], subtotal: 10_000, total: 10_000 });
  const before = structuredClone({ currentOrder: useOrderPaymentStore.getState().currentOrder, payments: useOrderPaymentStore.getState().payments });
  const payment = new Proxy({ id: "payment-proxy", tenantId: "tenant-1", orderId: "order-1", amount: 10_000, method: "cash", staffId: "staff-1", createdAt: 2 }, { getPrototypeOf: () => { throw new Error("hostile proxy"); } });

  expect(() => expect(useOrderPaymentStore.getState().recordPayment(payment)).toBe(false)).not.toThrow();
  expect({ currentOrder: useOrderPaymentStore.getState().currentOrder, payments: useOrderPaymentStore.getState().payments }).toEqual(before);
});
