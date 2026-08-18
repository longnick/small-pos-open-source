/**
 * send-to-kitchen.test.ts
 *
 * TDD RED-first tests for order-payment-store.sendToKitchen.
 *
 * Requirements:
 *   1. sendToKitchen succeeds only for an open order with at least one item.
 *   2. Success sets status=sent, sentAt, and one order.sent audit.
 *   3. Failure returns false with NO state mutation.
 */
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

const line = () => ({
  id: "line-1",
  orderId: "order-1",
  catalogItemId: "coffee",
  name: "Coffee",
  price: 25_000,
  quantity: 1,
});

const openWithItem = (): Order => ({
  ...order(),
  items: [line()],
  subtotal: 25_000,
  total: 25_000,
});

beforeEach(() => {
  useOrderPaymentStore.getState().clearCurrentOrder();
  useOrderPaymentStore.setState({
    payments: Object.freeze([]) as unknown as Payment[],
    auditEntries: [],
    lastReceipt: null,
  });
});

test("sendToKitchen marks open order sent, stores sentAt, and writes order.sent audit", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openWithItem());

  expect(useOrderPaymentStore.getState().sendToKitchen(10)).toBe(true);

  const state = useOrderPaymentStore.getState();
  expect(state.currentOrder).toMatchObject({
    id: "order-1",
    tenantId: "tenant-1",
    tableId: "table-1",
    staffId: "staff-1",
    status: "sent",
    sentAt: 10,
    items: [line()],
    subtotal: 25_000,
    total: 25_000,
  });
  expect(state.currentOrder).not.toHaveProperty("paidAt");
  expect(state.currentOrder).not.toHaveProperty("cancelledAt");
  expect(state.auditEntries).toMatchObject([{
    id: "send:order-1:10",
    tenantId: "tenant-1",
    staffId: "staff-1",
    action: "order.sent",
    entityType: "order",
    entityId: "order-1",
    details: { sentAt: 10 },
    timestamp: 10,
  }]);
  expect(state.payments).toEqual([]);
  expect(state.lastReceipt).toBeNull();
});

const snapshot = () => {
  const state = useOrderPaymentStore.getState();
  return structuredClone({
    currentOrder: state.currentOrder,
    payments: state.payments,
    auditEntries: state.auditEntries,
    lastReceipt: state.lastReceipt,
  });
};

test("sendToKitchen rejects empty order, missing order, invalid sentAt, and repeat send without mutation", () => {
  expect(useOrderPaymentStore.getState().sendToKitchen(10)).toBe(false);
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();

  useOrderPaymentStore.getState().selectOpenOrder(order());
  const empty = snapshot();
  expect(useOrderPaymentStore.getState().sendToKitchen(10)).toBe(false);
  expect(snapshot()).toEqual(empty);

  useOrderPaymentStore.getState().selectOpenOrder(openWithItem());
  const before = snapshot();
  expect(useOrderPaymentStore.getState().sendToKitchen(0)).toBe(false);
  expect(useOrderPaymentStore.getState().sendToKitchen(1.5)).toBe(false);
  expect(useOrderPaymentStore.getState().sendToKitchen("10")).toBe(false);
  expect(snapshot()).toEqual(before);

  expect(useOrderPaymentStore.getState().sendToKitchen(10)).toBe(true);
  const afterSend = snapshot();
  expect(useOrderPaymentStore.getState().sendToKitchen(11)).toBe(false);
  expect(snapshot()).toEqual(afterSend);
});

test("recordPayment accepts a sent order and keeps sentAt on the paid order", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openWithItem());
  expect(useOrderPaymentStore.getState().sendToKitchen(10)).toBe(true);

  expect(useOrderPaymentStore.getState().recordPayment({
    id: "pay-1",
    tenantId: "tenant-1",
    orderId: "order-1",
    amount: 25_000,
    tender: 25_000,
    method: "cash",
    staffId: "staff-1",
    createdAt: 20,
  })).toBe(true);

  expect(useOrderPaymentStore.getState().currentOrder).toMatchObject({
    status: "paid",
    sentAt: 10,
    paidAt: 20,
    total: 25_000,
  });
  expect(useOrderPaymentStore.getState().payments).toMatchObject([{ id: "pay-1", amount: 25_000 }]);
  expect(useOrderPaymentStore.getState().lastReceipt).toMatchObject({
    paymentId: "pay-1",
    paidTotal: 25_000,
    change: 0,
  });
});
