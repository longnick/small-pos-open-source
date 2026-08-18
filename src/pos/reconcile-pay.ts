import type { AuditEntry, Order, Payment, PosTable } from "../../packages/pos-core/src/types";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import type { DurablePaySnapshot } from "./dexie-persist";

export type ReconcilePayResult =
  | { kind: "predecessor" }
  | { kind: "winner" }
  | { kind: "rejected" };

const sameJson = (left: unknown, right: unknown): boolean => {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

const cashChange = (tender: number, amount: number): number | null => {
  const change = tender - amount;
  return Number.isSafeInteger(change) && change >= 0 ? change : null;
};

const isWinnerGraph = (durable: DurablePaySnapshot, predecessor: Order): {
  table: PosTable;
  order: Order;
  payment: Payment;
  audit: AuditEntry;
} | null => {
  const order = durable.order;
  const table = durable.table;
  if (!order || order.status !== "paid" || !Number.isSafeInteger(order.paidAt)) return null;
  if (table.status !== "empty" || table.tenantId !== order.tenantId || table.id !== order.tableId) return null;
  if (order.tenantId !== predecessor.tenantId || order.id !== predecessor.id || order.tableId !== predecessor.tableId || order.staffId !== predecessor.staffId) {
    return null;
  }
  if (durable.payments.length !== 1) return null;
  const payment = durable.payments[0];
  if (
    payment.orderId !== order.id
    || payment.tenantId !== order.tenantId
    || payment.staffId !== order.staffId
    || payment.amount !== order.total
    || payment.createdAt !== order.paidAt
    || !Number.isSafeInteger(payment.tender)
  ) return null;
  const change = payment.method === "cash" ? cashChange(payment.tender as number, payment.amount) : (payment.tender === payment.amount ? 0 : null);
  if (change === null) return null;
  const paymentAudits = durable.audits.filter((entry) => entry.action === "payment.recorded");
  if (paymentAudits.length !== 1) return null;
  const audit = paymentAudits[0];
  if (
    audit.id !== `payment:${payment.id}`
    || audit.tenantId !== order.tenantId
    || audit.staffId !== payment.staffId
    || audit.entityType !== "order"
    || audit.entityId !== order.id
    || audit.timestamp !== payment.createdAt
    || !sameJson(audit.details, {
      paymentId: payment.id,
      method: payment.method,
      paidTotal: order.total,
      tender: payment.tender,
      change,
    })
  ) return null;
  return { table, order, payment, audit };
};

export function reconcileLocalPayFromDurable(
  durable: DurablePaySnapshot,
  local: { localPaymentId: string; predecessor: Order },
): ReconcilePayResult {
  const predecessor = local.predecessor;
  const durableOrder = durable.order;
  if (
    durable.table.status === "occupied"
    && durable.table.currentOrderId === predecessor.id
    && durableOrder
    && (durableOrder.status === "open" || durableOrder.status === "sent")
    && durableOrder.id === predecessor.id
    && durableOrder.tenantId === predecessor.tenantId
    && durable.payments.length === 0
  ) {
    const tableOk = useCatalogTableStore.getState().applyDurableTable(durable.table, predecessor.id);
    const orderOk = tableOk && useOrderPaymentStore.getState().applyDurablePaySnapshot({
      order: durableOrder,
      payments: [],
      audits: durable.audits,
    });
    if (tableOk && orderOk) return { kind: "predecessor" };
    return { kind: "rejected" };
  }

  const winner = isWinnerGraph(durable, predecessor);
  if (!winner) return { kind: "rejected" };
  const tableOk = useCatalogTableStore.getState().applyDurableTable(winner.table, winner.order.id);
  if (!tableOk) return { kind: "rejected" };
  const orderOk = useOrderPaymentStore.getState().applyDurablePaySnapshot({
    order: winner.order,
    payments: [winner.payment],
    audits: durable.audits.filter((entry) => entry.action === "payment.recorded" || entry.action === "order.sent"),
  });
  if (!orderOk) return { kind: "rejected" };
  return { kind: "winner" };
}
