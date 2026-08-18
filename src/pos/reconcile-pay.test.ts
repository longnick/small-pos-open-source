import { beforeEach, expect, test } from "vitest";
import type { AuditEntry, Order, Payment, PosTable } from "../../packages/pos-core/src/types";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import { useTenantAuthStore } from "../stores/tenant-auth-store";
import { reconcileLocalPayFromDurable } from "./reconcile-pay";

const tenantId = "tenant-1";
const staff = { id: "staff-1", tenantId, name: "Cashier", role: "cashier" as const, pinHash: "v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", createdAt: 0 };

const occupied = (): PosTable => ({
  id: "table-1", tenantId, number: 1, status: "occupied", openedAt: 0, staffId: "staff-1", currentOrderId: "order-1",
});
const empty = (): PosTable => ({ id: "table-1", tenantId, number: 1, status: "empty", openedAt: 0, staffId: "staff-1" });
const line = () => ({ id: "line-1", orderId: "order-1", catalogItemId: "item-1", name: "Cà phê đen", price: 25_000, quantity: 1 });
const openOrder = (): Order => ({
  id: "order-1", tenantId, tableId: "table-1", staffId: "staff-1", status: "open",
  items: [line()], subtotal: 25_000, discount: 0, discountType: "amount", total: 25_000, createdAt: 1,
});
const paidOrder = (): Order => ({ ...openOrder(), status: "paid", paidAt: 20 });
const payment = (id = "pay-1"): Payment => ({
  id, tenantId, orderId: "order-1", amount: 25_000, tender: 25_000, method: "cash", staffId: "staff-1", createdAt: 20,
});
const payAudit = (id = "pay-1"): AuditEntry => ({
  id: `payment:${id}`, tenantId, staffId: "staff-1", action: "payment.recorded", entityType: "order", entityId: "order-1",
  details: { paymentId: id, method: "cash", paidTotal: 25_000, tender: 25_000, change: 0 }, timestamp: 20,
});

beforeEach(() => {
  useTenantAuthStore.setState({ tenant: null, staff });
  useCatalogTableStore.setState({
    tenantId,
    catalogGroups: [],
    catalogItems: [],
    tables: [occupied()],
  });
  useOrderPaymentStore.getState().clearCurrentOrder();
  useOrderPaymentStore.setState({ payments: Object.freeze([]) as unknown as Payment[], auditEntries: [], lastReceipt: null });
});

test("reconcile restores predecessor only when durable is occupied, exact predecessor, zero payment", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  expect(useCatalogTableStore.getState().releaseTable("table-1", "order-1")).toBe(true);

  expect(reconcileLocalPayFromDurable({
    table: occupied(),
    order: openOrder(),
    payments: [],
    audits: [],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "predecessor" });

  expect(useOrderPaymentStore.getState().currentOrder).toMatchObject({ status: "open", id: "order-1" });
  expect(useOrderPaymentStore.getState().payments).toEqual([]);
  expect(useCatalogTableStore.getState().tableById("table-1")).toMatchObject({ status: "occupied", currentOrderId: "order-1" });
});

test("reconcile adopts durable winner paid + empty table and blocks a second local pay", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);

  expect(reconcileLocalPayFromDurable({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "winner" });

  expect(useOrderPaymentStore.getState().currentOrder).toMatchObject({ status: "paid", paidAt: 20 });
  expect(useOrderPaymentStore.getState().payments).toEqual([payment("pay-1")]);
  expect(useCatalogTableStore.getState().tableById("table-1")).toMatchObject({ status: "empty" });
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-3"))).toBe(false);
});

test("reconcile does not report winner when local table is rebound to another order", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  useCatalogTableStore.setState({
    tenantId,
    catalogGroups: [],
    catalogItems: [],
    tables: [{ ...occupied(), currentOrderId: "order-other" }],
  });
  const before = useCatalogTableStore.getState().tableById("table-1");

  expect(reconcileLocalPayFromDurable({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });

  expect(useCatalogTableStore.getState().tableById("table-1")).toEqual(before);
});

test("reconcile does not report winner when winner graph is incomplete or extra payment audit exists", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  const beforePay = useOrderPaymentStore.getState().payments.map((row) => row.id);

  expect(reconcileLocalPayFromDurable({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });

  expect(reconcileLocalPayFromDurable({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1"), { ...payAudit("pay-extra"), id: "payment:pay-extra", details: { ...payAudit("pay-extra").details, paymentId: "pay-extra" } }],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });

  expect(useOrderPaymentStore.getState().payments.map((row) => row.id)).toEqual(beforePay);
});
