import { computeDiscount, computeSubtotal, computeTotal } from "../../packages/pos-core/src/order-calc";
import type { AuditEntry, Order, Payment, PosTable } from "../../packages/pos-core/src/types";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import type { DurablePaySnapshot } from "./dexie-persist";

export type ReconcilePayResult =
  | { kind: "predecessor" }
  | { kind: "winner" }
  | { kind: "rejected" };

export type PayReconcilePlan =
  | { kind: "rejected" }
  | {
    kind: "predecessor";
    table: PosTable;
    order: Order;
    audits: AuditEntry[];
    localPaymentId: string;
    predecessor: Order;
  }
  | {
    kind: "winner";
    table: PosTable;
    order: Order;
    payment: Payment;
    audits: AuditEntry[];
    localPaymentId: string;
    predecessor: Order;
  };

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

const uniqueIds = (ids: string[]): boolean => new Set(ids).size === ids.length;

const validateDurableOrder = (order: Order, predecessor: Order): boolean => {
  if (order.id !== predecessor.id || order.tenantId !== predecessor.tenantId || order.tableId !== predecessor.tableId || order.staffId !== predecessor.staffId) {
    return false;
  }
  if (!Array.isArray(order.items) || order.items.some((item) => item.orderId !== order.id)) return false;
  if (!uniqueIds(order.items.map((item) => item.id))) return false;
  try {
    const subtotal = computeSubtotal(order.items);
    const discountValue = order.discountType === "percent" ? order.discountPercent : order.discount;
    if (discountValue === undefined) return false;
    if (order.subtotal !== subtotal) return false;
    if (order.discount !== computeDiscount(subtotal, order.discountType, discountValue)) return false;
    if (order.total !== computeTotal(subtotal, order.discount)) return false;
  } catch {
    return false;
  }
  if (!Number.isSafeInteger(order.createdAt)) return false;
  if (order.status === "paid") {
    if (!Number.isSafeInteger(order.paidAt) || (order.paidAt as number) < order.createdAt) return false;
    if (order.sentAt !== undefined && ((order.sentAt as number) < order.createdAt || (order.paidAt as number) < (order.sentAt as number))) return false;
    const { status: _ps, paidAt: _pp, ...paidRest } = order;
    const { status: _os, paidAt: _op, ...predRest } = predecessor;
    return sameJson(paidRest, predRest) && (predecessor.status === "open" || predecessor.status === "sent");
  }
  return sameJson(order, predecessor);
};

const canApplyEmptyOrOccupied = (table: PosTable, orderId: string): boolean => {
  const catalog = useCatalogTableStore.getState();
  if (catalog.tenantId !== table.tenantId) return false;
  const local = catalog.tables.find((row) => row.id === table.id);
  if (!local || local.tenantId !== table.tenantId) return false;
  if (table.status === "empty") {
    if (local.status === "empty") return true;
    return (local.status === "occupied" || local.status === "waiting_payment") && local.currentOrderId === orderId;
  }
  if (table.status === "occupied" && table.currentOrderId === orderId) {
    return local.status === "empty" || local.currentOrderId === orderId;
  }
  return false;
};

const localCasHolds = (localPaymentId: string, predecessor: Order): boolean => {
  const order = useOrderPaymentStore.getState().currentOrder;
  if (!order || order.id !== predecessor.id || order.tenantId !== predecessor.tenantId) return false;
  if (order.status === "paid") {
    return useOrderPaymentStore.getState().payments.some((payment) => payment.id === localPaymentId && payment.orderId === order.id);
  }
  return order.status === predecessor.status;
};

const isWinnerGraph = (durable: DurablePaySnapshot, predecessor: Order): {
  table: PosTable;
  order: Order;
  payment: Payment;
  audit: AuditEntry;
} | null => {
  const order = durable.order;
  const table = durable.table;
  if (!order || order.status !== "paid" || !validateDurableOrder(order, predecessor)) return null;
  if (table.status !== "empty" || table.tenantId !== order.tenantId || table.id !== order.tableId) return null;
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

export function planPayReconcile(
  durable: DurablePaySnapshot,
  local: { localPaymentId: string; predecessor: Order },
): PayReconcilePlan {
  const predecessor = local.predecessor;
  const durableOrder = durable.order;
  if (!localCasHolds(local.localPaymentId, predecessor)) return { kind: "rejected" };

  if (
    durable.table.status === "occupied"
    && durable.table.currentOrderId === predecessor.id
    && durableOrder
    && (durableOrder.status === "open" || durableOrder.status === "sent")
    && validateDurableOrder(durableOrder, predecessor)
    && durable.payments.length === 0
    && canApplyEmptyOrOccupied(durable.table, predecessor.id)
  ) {
    return {
      kind: "predecessor",
      table: durable.table,
      order: durableOrder,
      audits: durable.audits,
      localPaymentId: local.localPaymentId,
      predecessor,
    };
  }

  const winner = isWinnerGraph(durable, predecessor);
  if (!winner || !canApplyEmptyOrOccupied(winner.table, winner.order.id)) return { kind: "rejected" };
  return {
    kind: "winner",
    table: winner.table,
    order: winner.order,
    payment: winner.payment,
    audits: durable.audits.filter((entry) => entry.action === "payment.recorded" || entry.action === "order.sent"),
    localPaymentId: local.localPaymentId,
    predecessor,
  };
}

export function commitPayReconcile(plan: PayReconcilePlan): ReconcilePayResult {
  if (plan.kind === "rejected") return { kind: "rejected" };
  if (!localCasHolds(plan.localPaymentId, plan.predecessor)) return { kind: "rejected" };
  if (!canApplyEmptyOrOccupied(plan.table, plan.order.id)) return { kind: "rejected" };
  const orderOk = useOrderPaymentStore.getState().applyDurablePaySnapshot({
    order: plan.order,
    payments: plan.kind === "winner" ? [plan.payment] : [],
    audits: plan.audits,
  });
  if (!orderOk) return { kind: "rejected" };
  const tableOk = useCatalogTableStore.getState().applyDurableTable(plan.table, plan.order.id);
  if (!tableOk) {
    useOrderPaymentStore.getState().applyDurablePaySnapshot({
      order: plan.predecessor,
      payments: [],
      audits: [],
    });
    return { kind: "rejected" };
  }
  return { kind: plan.kind };
}

export function reconcileLocalPayFromDurable(
  durable: DurablePaySnapshot,
  local: { localPaymentId: string; predecessor: Order },
): ReconcilePayResult {
  return commitPayReconcile(planPayReconcile(durable, local));
}
