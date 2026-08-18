import { beforeEach, expect, test } from "vitest";
import type { Order, Payment, Role, Staff } from "../../packages/pos-core/src/types";
import { useOrderPaymentStore } from "./order-payment-store";
import { useTenantAuthStore } from "./tenant-auth-store";

const order = (): Order => ({
  id: "order-1",
  tenantId: "tenant-1",
  tableId: "table-1",
  staffId: "staff-1",
  status: "open",
  items: [{ id: "line-1", orderId: "order-1", catalogItemId: "coffee", name: "Coffee", price: 25_000, quantity: 1 }],
  subtotal: 25_000,
  discount: 0,
  discountType: "amount",
  total: 25_000,
  createdAt: 1,
});

const staff = (role: Role, tenantId = "tenant-1"): Staff => ({
  id: "staff-1",
  tenantId,
  name: role,
  role,
  pinHash: "hash",
  createdAt: 1,
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

beforeEach(() => {
  useOrderPaymentStore.getState().clearCurrentOrder();
  useOrderPaymentStore.setState({
    payments: Object.freeze([]) as unknown as Payment[],
    auditEntries: [],
    lastReceipt: null,
  });
  useTenantAuthStore.setState({ tenant: null, staff: null });
});

test("sendToKitchen and recordPayment require matching tenant staff and action permission", () => {
  useOrderPaymentStore.getState().selectOpenOrder(order());
  const before = snapshot();

  expect(useOrderPaymentStore.getState().sendToKitchen(10)).toBe(false);
  expect(snapshot()).toEqual(before);

  useTenantAuthStore.setState({ staff: staff("kitchen") });
  expect(useOrderPaymentStore.getState().sendToKitchen(10)).toBe(false);
  expect(snapshot()).toEqual(before);

  useTenantAuthStore.setState({ staff: staff("staff", "other") });
  expect(useOrderPaymentStore.getState().sendToKitchen(10)).toBe(false);
  expect(snapshot()).toEqual(before);

  useTenantAuthStore.setState({ staff: staff("staff") });
  expect(useOrderPaymentStore.getState().sendToKitchen(10)).toBe(true);
  expect(useOrderPaymentStore.getState().currentOrder?.status).toBe("sent");

  const afterSend = snapshot();
  useTenantAuthStore.setState({ staff: staff("staff") });
  expect(useOrderPaymentStore.getState().recordPayment({
    id: "pay-1",
    tenantId: "tenant-1",
    orderId: "order-1",
    amount: 25_000,
    tender: 25_000,
    method: "cash",
    staffId: "staff-1",
    createdAt: 20,
  })).toBe(false);
  expect(snapshot()).toEqual(afterSend);

  useTenantAuthStore.setState({ staff: staff("cashier") });
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
  expect(useOrderPaymentStore.getState().currentOrder?.status).toBe("paid");
});

test("manager can send and pay; kitchen cannot pay", () => {
  useOrderPaymentStore.getState().selectOpenOrder(order());
  useTenantAuthStore.setState({ staff: staff("manager") });
  expect(useOrderPaymentStore.getState().sendToKitchen(10)).toBe(true);

  useTenantAuthStore.setState({ staff: staff("kitchen") });
  const afterSend = snapshot();
  expect(useOrderPaymentStore.getState().recordPayment({
    id: "pay-2",
    tenantId: "tenant-1",
    orderId: "order-1",
    amount: 25_000,
    tender: 25_000,
    method: "cash",
    staffId: "staff-1",
    createdAt: 20,
  })).toBe(false);
  expect(snapshot()).toEqual(afterSend);

  useTenantAuthStore.setState({ staff: staff("manager") });
  expect(useOrderPaymentStore.getState().recordPayment({
    id: "pay-2",
    tenantId: "tenant-1",
    orderId: "order-1",
    amount: 25_000,
    tender: 25_000,
    method: "cash",
    staffId: "staff-1",
    createdAt: 20,
  })).toBe(true);
});
