import { computeDiscount, computeSubtotal, computeTotal } from "../../packages/pos-core/src/order-calc";
import { isAuditRecord } from "../../packages/pos-core/src/product-records";
import type { AuditEntry, Order, Payment, PosTable } from "../../packages/pos-core/src/types";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import type { DurablePaySnapshot } from "./dexie-persist";

export type ReconcilePayResult =
  | { kind: "predecessor" }
  | { kind: "winner" }
  | { kind: "rejected" };

type LocalPaySnapshot = {
  currentOrder: Order | null;
  payments: Payment[];
  audits: AuditEntry[];
  lastReceipt: unknown;
  tenantId: string | null;
  tables: PosTable[];
  table: PosTable | null;
  sessionToken?: number;
};

export type PayReconcilePlan =
  | { kind: "rejected" }
  | {
    kind: "predecessor";
    table: PosTable;
    order: Order;
    audits: AuditEntry[];
    localPaymentId: string;
    predecessor: Order;
    local: LocalPaySnapshot;
  }
  | {
    kind: "winner";
    table: PosTable;
    order: Order;
    payment: Payment;
    audits: AuditEntry[];
    localPaymentId: string;
    predecessor: Order;
    local: LocalPaySnapshot;
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

const captureLocal = (sessionToken?: number): LocalPaySnapshot => {
  const orders = useOrderPaymentStore.getState();
  const catalog = useCatalogTableStore.getState();
  return {
    currentOrder: orders.currentOrder ? structuredClone(orders.currentOrder) : null,
    payments: structuredClone(orders.payments),
    audits: structuredClone(orders.auditEntries),
    lastReceipt: structuredClone(orders.lastReceipt),
    tenantId: catalog.tenantId,
    tables: structuredClone(catalog.tables),
    table: catalog.tables.find((row) => row.id === orders.currentOrder?.tableId) ?? null,
    sessionToken,
  };
};

const restoreLocal = (local: LocalPaySnapshot): void => {
  useOrderPaymentStore.setState({
    currentOrder: local.currentOrder,
    payments: local.payments,
    auditEntries: local.audits,
    lastReceipt: local.lastReceipt as never,
  });
  useCatalogTableStore.setState({
    tenantId: local.tenantId,
    tables: local.tables,
  });
};

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

const validateDurableTable = (table: PosTable, order: Order, localTable: PosTable | null): boolean => {
  if (!Number.isSafeInteger(table.number) || table.number < 1 || table.number > 10) return false;
  if (!Number.isSafeInteger(table.openedAt)) return false;
  if (table.tenantId !== order.tenantId || table.id !== order.tableId) return false;
  if (table.status === "empty") {
    if (table.currentOrderId !== undefined) return false;
    if (localTable && (table.number !== localTable.number || table.openedAt !== localTable.openedAt)) return false;
    return table.staffId === order.staffId;
  }
  if (table.status === "occupied") {
    return table.currentOrderId === order.id && table.staffId === order.staffId;
  }
  return false;
};

const isCanonicalSendAudit = (audit: AuditEntry, order: Order): boolean =>
  audit.id === `send:${order.id}`
  && audit.action === "order.sent"
  && audit.entityType === "order"
  && audit.entityId === order.id
  && audit.tenantId === order.tenantId
  && audit.staffId === order.staffId
  && audit.timestamp === order.sentAt
  && sameJson(audit.details, { sentAt: order.sentAt });

const isCanonicalPaymentAudit = (audit: AuditEntry, order: Order, payment: Payment, change: number): boolean =>
  audit.id === `payment:${payment.id}`
  && audit.action === "payment.recorded"
  && audit.entityType === "order"
  && audit.entityId === order.id
  && audit.tenantId === order.tenantId
  && audit.staffId === payment.staffId
  && audit.timestamp === payment.createdAt
  && sameJson(audit.details, {
    paymentId: payment.id,
    method: payment.method,
    paidTotal: order.total,
    tender: payment.tender,
    change,
  });

const validateAuditGraph = (durable: DurablePaySnapshot, predecessor: Order, payment: Payment | null): boolean => {
  if (!durable.audits.every((entry) => isAuditRecord(entry))) return false;
  const paymentAudits = durable.audits.filter((entry) => entry.action === "payment.recorded");
  const sendAudits = durable.audits.filter((entry) => entry.action === "order.sent");
  if (payment === null) {
    if (paymentAudits.length !== 0) return false;
    if (predecessor.status === "open") return sendAudits.length === 0;
    if (predecessor.status === "sent") {
      return sendAudits.length === 1 && isCanonicalSendAudit(sendAudits[0], predecessor);
    }
    return false;
  }
  if (paymentAudits.length !== 1) return false;
  const change = payment.method === "cash" ? cashChange(payment.tender as number, payment.amount) : (payment.tender === payment.amount ? 0 : null);
  if (change === null || !isCanonicalPaymentAudit(paymentAudits[0], durable.order as Order, payment, change)) return false;
  if (predecessor.status === "open") return sendAudits.length === 0;
  if (predecessor.status === "sent") {
    return sendAudits.length === 1 && durable.order !== null && isCanonicalSendAudit(sendAudits[0], durable.order);
  }
  return false;
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

const localCasExact = (local: LocalPaySnapshot): boolean => {
  const orders = useOrderPaymentStore.getState();
  const catalog = useCatalogTableStore.getState();
  return sameJson(orders.currentOrder, local.currentOrder)
    && sameJson(orders.payments, local.payments)
    && sameJson(orders.auditEntries, local.audits)
    && sameJson(orders.lastReceipt, local.lastReceipt)
    && catalog.tenantId === local.tenantId
    && sameJson(catalog.tables, local.tables);
};

const isWinnerGraph = (durable: DurablePaySnapshot, predecessor: Order, localTable: PosTable | null): {
  table: PosTable;
  order: Order;
  payment: Payment;
} | null => {
  const order = durable.order;
  const table = durable.table;
  if (!order || order.status !== "paid" || !validateDurableOrder(order, predecessor)) return null;
  if (!validateDurableTable(table, order, localTable)) return null;
  if (table.status !== "empty") return null;
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
  if (!validateAuditGraph(durable, predecessor, payment)) return null;
  return { table, order, payment };
};

export function planPayReconcile(
  durable: DurablePaySnapshot,
  local: { localPaymentId: string; predecessor: Order; sessionToken?: number },
): PayReconcilePlan {
  const predecessor = local.predecessor;
  const snapshot = captureLocal(local.sessionToken);
  const durableOrder = durable.order;
  if (!snapshot.currentOrder || snapshot.currentOrder.id !== predecessor.id) return { kind: "rejected" };
  if (!snapshot.payments.some((payment) => payment.id === local.localPaymentId && payment.orderId === predecessor.id)) {
    return { kind: "rejected" };
  }

  if (
    durable.table.status === "occupied"
    && durableOrder
    && (durableOrder.status === "open" || durableOrder.status === "sent")
    && validateDurableOrder(durableOrder, predecessor)
    && validateDurableTable(durable.table, durableOrder, snapshot.table)
    && durable.payments.length === 0
    && validateAuditGraph(durable, predecessor, null)
    && canApplyEmptyOrOccupied(durable.table, predecessor.id)
  ) {
    return {
      kind: "predecessor",
      table: durable.table,
      order: durableOrder,
      audits: durable.audits,
      localPaymentId: local.localPaymentId,
      predecessor,
      local: snapshot,
    };
  }

  const winner = isWinnerGraph(durable, predecessor, snapshot.table);
  if (!winner || !canApplyEmptyOrOccupied(winner.table, winner.order.id)) return { kind: "rejected" };
  return {
    kind: "winner",
    table: winner.table,
    order: winner.order,
    payment: winner.payment,
    audits: durable.audits.filter((entry) => entry.action === "payment.recorded" || entry.action === "order.sent"),
    localPaymentId: local.localPaymentId,
    predecessor,
    local: snapshot,
  };
}

export function commitPayReconcile(plan: PayReconcilePlan): ReconcilePayResult {
  if (plan.kind === "rejected") return { kind: "rejected" };
  if (!localCasExact(plan.local)) return { kind: "rejected" };
  if (!canApplyEmptyOrOccupied(plan.table, plan.order.id)) return { kind: "rejected" };
  const orderOk = useOrderPaymentStore.getState().applyDurablePaySnapshot({
    order: plan.order,
    payments: plan.kind === "winner" ? [plan.payment] : [],
    audits: plan.audits,
  });
  if (!orderOk) {
    restoreLocal(plan.local);
    return { kind: "rejected" };
  }
  const tableOk = useCatalogTableStore.getState().applyDurableTable(plan.table, plan.order.id);
  if (!tableOk) {
    restoreLocal(plan.local);
    return { kind: "rejected" };
  }
  const applied = useCatalogTableStore.getState().tables.find((row) => row.id === plan.table.id);
  if (!applied || !sameJson(applied, plan.table)) {
    restoreLocal(plan.local);
    return { kind: "rejected" };
  }
  return { kind: plan.kind };
}

export function reconcileLocalPayFromDurable(
  durable: DurablePaySnapshot,
  local: { localPaymentId: string; predecessor: Order; sessionToken?: number },
): ReconcilePayResult {
  return commitPayReconcile(planPayReconcile(durable, local));
}
