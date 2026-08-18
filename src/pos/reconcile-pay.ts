import { computeDiscount, computeSubtotal, computeTotal } from "../../packages/pos-core/src/order-calc";
import { isAuditRecord } from "../../packages/pos-core/src/product-records";
import type { AuditEntry, Order, Payment, PosTable } from "../../packages/pos-core/src/types";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import { useTenantAuthStore } from "../stores/tenant-auth-store";
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
    fingerprint: string;
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
    fingerprint: string;
  };

const sameJson = (left: unknown, right: unknown): boolean => {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

const freezeDeep = <T>(value: T): T => {
  if (value === null || typeof value !== "object") return value;
  const cloned = structuredClone(value) as T;
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== "object" || Object.isFrozen(node)) return;
    if (Array.isArray(node)) node.forEach(walk);
    else Object.values(node).forEach(walk);
    Object.freeze(node);
  };
  walk(cloned);
  return cloned;
};

const cashChange = (tender: number, amount: number): number | null => {
  const change = tender - amount;
  return Number.isSafeInteger(change) && change >= 0 ? change : null;
};

const uniqueIds = (ids: string[]): boolean => new Set(ids).size === ids.length;

const captureLocal = (sessionToken?: number): LocalPaySnapshot => {
  const orders = useOrderPaymentStore.getState();
  const catalog = useCatalogTableStore.getState();
  return freezeDeep({
    currentOrder: orders.currentOrder ? structuredClone(orders.currentOrder) : null,
    payments: structuredClone(orders.payments),
    audits: structuredClone(orders.auditEntries),
    lastReceipt: structuredClone(orders.lastReceipt),
    tenantId: catalog.tenantId,
    tables: structuredClone(catalog.tables),
    table: structuredClone(catalog.tables.find((row) => row.id === orders.currentOrder?.tableId) ?? null),
    sessionToken,
  });
};

const restoreLocal = (local: LocalPaySnapshot): void => {
  useOrderPaymentStore.getState().restoreOwnedPayState({
    currentOrder: local.currentOrder ? structuredClone(local.currentOrder) : null,
    payments: structuredClone(local.payments),
    audits: structuredClone(local.audits),
    lastReceipt: structuredClone(local.lastReceipt),
  });
  useCatalogTableStore.getState().restoreOwnedTables(local.tenantId, structuredClone(local.tables));
};

const sessionMatches = (expected?: number): boolean =>
  expected === undefined || useTenantAuthStore.getState().sessionToken === expected;

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
  if (localTable && (table.number !== localTable.number || table.openedAt !== localTable.openedAt || table.id !== localTable.id || table.tenantId !== localTable.tenantId)) {
    return false;
  }
  if (table.status === "empty") {
    if (table.currentOrderId !== undefined) return false;
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
    && sameJson(catalog.tables, local.tables)
    && sessionMatches(local.sessionToken);
};

const planFingerprint = (plan: Omit<Extract<PayReconcilePlan, { kind: "winner" } | { kind: "predecessor" }>, "fingerprint" | "local">): string =>
  JSON.stringify({
    kind: plan.kind,
    table: plan.table,
    order: plan.order,
    audits: plan.audits,
    predecessor: plan.predecessor,
    localPaymentId: plan.localPaymentId,
    ...("payment" in plan ? { payment: plan.payment } : {}),
  });

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
  const predecessor = freezeDeep(local.predecessor);
  const snapshot = captureLocal(local.sessionToken);
  const durableOrder = durable.order;
  if (!snapshot.currentOrder || snapshot.currentOrder.id !== predecessor.id) return { kind: "rejected" };
  if (!snapshot.payments.some((payment) => payment.id === local.localPaymentId && payment.orderId === predecessor.id)) {
    return { kind: "rejected" };
  }
  if (!sessionMatches(local.sessionToken)) return { kind: "rejected" };

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
    const planned = {
      kind: "predecessor" as const,
      table: freezeDeep(durable.table),
      order: freezeDeep(durableOrder),
      audits: freezeDeep(durable.audits),
      localPaymentId: local.localPaymentId,
      predecessor,
    };
    return freezeDeep({ ...planned, local: snapshot, fingerprint: planFingerprint(planned) });
  }

  const winner = isWinnerGraph(durable, predecessor, snapshot.table);
  if (!winner || !canApplyEmptyOrOccupied(winner.table, winner.order.id)) return { kind: "rejected" };
  const planned = {
    kind: "winner" as const,
    table: freezeDeep(winner.table),
    order: freezeDeep(winner.order),
    payment: freezeDeep(winner.payment),
    audits: freezeDeep(durable.audits.filter((entry) => entry.action === "payment.recorded" || entry.action === "order.sent")),
    localPaymentId: local.localPaymentId,
    predecessor,
  };
  return freezeDeep({ ...planned, local: snapshot, fingerprint: planFingerprint(planned) });
}

export function commitPayReconcile(plan: PayReconcilePlan): ReconcilePayResult {
  if (plan.kind === "rejected") return { kind: "rejected" };
  const { local, fingerprint, ...durable } = plan;
  if (planFingerprint(durable) !== fingerprint) return { kind: "rejected" };
  if (!localCasExact(local)) return { kind: "rejected" };
  if (!canApplyEmptyOrOccupied(plan.table, plan.order.id)) return { kind: "rejected" };
  if (!sessionMatches(local.sessionToken)) return { kind: "rejected" };
  const orderOk = useOrderPaymentStore.getState().applyDurablePaySnapshot({
    order: structuredClone(plan.order),
    payments: plan.kind === "winner" ? [structuredClone(plan.payment)] : [],
    audits: structuredClone(plan.audits),
  });
  if (!orderOk) {
    if (sessionMatches(local.sessionToken)) restoreLocal(local);
    return { kind: "rejected" };
  }
  if (!sessionMatches(local.sessionToken)) return { kind: "rejected" };
  const tableOk = useCatalogTableStore.getState().applyDurableTable(structuredClone(plan.table), plan.order.id);
  if (!tableOk) {
    if (sessionMatches(local.sessionToken)) restoreLocal(local);
    return { kind: "rejected" };
  }
  if (!sessionMatches(local.sessionToken)) return { kind: "rejected" };
  const applied = useCatalogTableStore.getState().tables.find((row) => row.id === plan.table.id);
  if (!applied || !sameJson(applied, plan.table)) {
    if (sessionMatches(local.sessionToken)) restoreLocal(local);
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
