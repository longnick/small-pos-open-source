import { PosDatabase } from "../../packages/pos-storage/src/db";
import type { AuditEntry, Order, OrderItem, Payment, PosTable } from "../../packages/pos-core/src/types";
import { isAuditRecord } from "../../packages/pos-core/src/product-records";
import { notifyDexieTabWrite } from "./dexie-tabs";

export type DexiePersistInput = {
  authenticatedTenantId: string;
  databaseName?: string;
};

export type PersistResult = true | false;

export type PayPersistOutcome =
  | { kind: "committed" }
  | { kind: "idempotent" }
  | { kind: "conflict" }
  | { kind: "io-error" }
  | { kind: "invalid" };

export type DurablePaySnapshot = {
  table: PosTable;
  order: Order | null;
  payments: Payment[];
  audits: AuditEntry[];
};

export type DurablePayLoad =
  | { kind: "ok" } & DurablePaySnapshot
  | { kind: "corrupt" };

let persistSession = false;

export function setDexiePersistSession(enabled: boolean): void {
  persistSession = enabled === true;
}

export function isDexiePersistSession(): boolean {
  return persistSession;
}

const isPrimitiveNonemptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isTableNumber = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 10;
const isOptionalString = (value: unknown): value is string | undefined => value === undefined || typeof value === "string";
const isMoney = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

const materializeRecord = (value: unknown): Record<string, unknown> | null => {
  try {
    if (!isPlainObject(value)) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => !("value" in descriptors[key as keyof typeof descriptors]))) return null;
    return Object.fromEntries(Reflect.ownKeys(descriptors).map((key) => [key, descriptors[key as keyof typeof descriptors].value]));
  } catch {
    return null;
  }
};

const isOrderItem = (value: Record<string, unknown>): value is Record<string, unknown> & OrderItem =>
  isPrimitiveNonemptyString(value.id)
  && isPrimitiveNonemptyString(value.orderId)
  && isPrimitiveNonemptyString(value.catalogItemId)
  && isPrimitiveNonemptyString(value.name)
  && isMoney(value.price)
  && Number.isSafeInteger(value.quantity)
  && (value.quantity as number) > 0
  && (value.note === undefined || typeof value.note === "string")
  && (value.cancelledAt === undefined || Number.isSafeInteger(value.cancelledAt))
  && (value.cancelReason === undefined || typeof value.cancelReason === "string");

const isOrder = (value: Record<string, unknown>): value is Record<string, unknown> & Order =>
  isPrimitiveNonemptyString(value.id)
  && isPrimitiveNonemptyString(value.tenantId)
  && isPrimitiveNonemptyString(value.tableId)
  && isPrimitiveNonemptyString(value.staffId)
  && (value.status === "open" || value.status === "sent" || value.status === "paid" || value.status === "cancelled")
  && Array.isArray(value.items)
  && isMoney(value.subtotal)
  && isMoney(value.discount)
  && (value.discountType === "amount" || value.discountType === "percent")
  && isMoney(value.total)
  && Number.isSafeInteger(value.createdAt);

const isPosTable = (value: Record<string, unknown>): value is Record<string, unknown> & PosTable =>
  isPrimitiveNonemptyString(value.id)
  && isPrimitiveNonemptyString(value.tenantId)
  && isPrimitiveNonemptyString(value.staffId)
  && isTableNumber(value.number)
  && (value.status === "empty" || value.status === "occupied" || value.status === "waiting_payment")
  && isFiniteNumber(value.openedAt)
  && isOptionalString(value.currentOrderId);

const isPayment = (value: Record<string, unknown>): value is Record<string, unknown> & Payment =>
  isPrimitiveNonemptyString(value.id)
  && isPrimitiveNonemptyString(value.tenantId)
  && isPrimitiveNonemptyString(value.orderId)
  && isMoney(value.amount)
  && isMoney(value.tender)
  && (value.method === "cash" || value.method === "transfer" || value.method === "card" || value.method === "other")
  && isPrimitiveNonemptyString(value.staffId)
  && Number.isSafeInteger(value.createdAt)
  && (value.note === undefined || typeof value.note === "string");

const canonicalItem = (item: OrderItem): OrderItem => ({
  id: item.id,
  orderId: item.orderId,
  catalogItemId: item.catalogItemId,
  name: item.name,
  price: item.price,
  quantity: item.quantity,
  ...(item.note !== undefined ? { note: item.note } : {}),
  ...(item.cancelledAt !== undefined ? { cancelledAt: item.cancelledAt } : {}),
  ...(item.cancelReason !== undefined ? { cancelReason: item.cancelReason } : {}),
});

const canonicalOrder = (order: Order): Order => ({
  id: order.id,
  tenantId: order.tenantId,
  tableId: order.tableId,
  staffId: order.staffId,
  status: order.status,
  items: order.items.map(canonicalItem),
  subtotal: order.subtotal,
  discount: order.discount,
  discountType: order.discountType,
  total: order.total,
  createdAt: order.createdAt,
  ...(order.discountPercent !== undefined ? { discountPercent: order.discountPercent } : {}),
  ...(order.sentAt !== undefined ? { sentAt: order.sentAt } : {}),
  ...(order.paidAt !== undefined ? { paidAt: order.paidAt } : {}),
  ...(order.cancelledAt !== undefined ? { cancelledAt: order.cancelledAt } : {}),
});

const canonicalTable = (table: PosTable): PosTable => ({
  id: table.id,
  tenantId: table.tenantId,
  number: table.number,
  status: table.status,
  openedAt: table.openedAt,
  staffId: table.staffId,
  ...(table.currentOrderId !== undefined ? { currentOrderId: table.currentOrderId } : {}),
});

const canonicalPayment = (payment: Payment): Payment => ({
  id: payment.id,
  tenantId: payment.tenantId,
  orderId: payment.orderId,
  amount: payment.amount,
  tender: payment.tender,
  method: payment.method,
  staffId: payment.staffId,
  createdAt: payment.createdAt,
  ...(payment.note !== undefined ? { note: payment.note } : {}),
});

const materializeOrder = (value: unknown): Order | null => {
  const order = materializeRecord(value);
  if (!order || !isOrder(order)) return null;
  const items: OrderItem[] = [];
  for (const raw of order.items) {
    const record = materializeRecord(raw);
    if (!record || !isOrderItem(record)) return null;
    items.push(canonicalItem(record));
  }
  return canonicalOrder({ ...order, items });
};

const materializeTable = (value: unknown): PosTable | null => {
  const table = materializeRecord(value);
  return table && isPosTable(table) ? canonicalTable(table) : null;
};

const materializePayment = (value: unknown): Payment | null => {
  const payment = materializeRecord(value);
  return payment && isPayment(payment) ? canonicalPayment(payment) : null;
};

const sameJson = (left: unknown, right: unknown): boolean => {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

const canonicalAudit = (value: unknown): AuditEntry | null => {
  const record = materializeRecord(value);
  if (!record || !isAuditRecord(record)) return null;
  return {
    id: record.id as string,
    tenantId: record.tenantId as string,
    staffId: record.staffId as string,
    action: record.action as string,
    entityType: record.entityType as string,
    entityId: record.entityId as string,
    details: { ...(record.details as Record<string, unknown>) },
    timestamp: record.timestamp as number,
  };
};

async function withWritableDb<T>(
  input: DexiePersistInput,
  stores: string[],
  write: (database: PosDatabase) => Promise<T>,
): Promise<T | false> {
  if (!persistSession || !input || !isPrimitiveNonemptyString(input.authenticatedTenantId)) return false;
  try {
    const database = new PosDatabase(input.databaseName ?? "small-pos");
    try {
      await database.open();
      return await database.transaction("rw", stores, async () => write(database));
    } finally {
      database.close();
    }
  } catch {
    return false;
  }
}

export async function persistAfterOccupy(
  input: DexiePersistInput,
  snapshot: { table: PosTable; order: Order },
): Promise<PersistResult> {
  let table: PosTable | null = null;
  let order: Order | null = null;
  try {
    table = materializeTable(snapshot?.table);
    order = materializeOrder(snapshot?.order);
  } catch {
    return false;
  }
  if (
    !table
    || !order
    || table.tenantId !== input.authenticatedTenantId
    || order.tenantId !== input.authenticatedTenantId
    || table.status !== "occupied"
    || table.currentOrderId !== order.id
    || order.status !== "open"
    || order.tableId !== table.id
  ) return false;

  const written = await withWritableDb(input, ["tables", "orders"], async (database) => {
    const existing = await database.table<PosTable>("tables").get(table.id);
    if (existing && existing.status !== "empty" && existing.currentOrderId !== order.id) return false;
    await database.posTables.put(table);
    await database.orders.put(order);
    return true;
  });
  if (written === true) notifyDexieTabWrite({ tenantId: input.authenticatedTenantId, kind: "occupy" });
  return written === true;
}

export async function persistAfterOrderEdit(
  input: DexiePersistInput,
  snapshot: { order: Order },
): Promise<PersistResult> {
  let order: Order | null = null;
  try {
    order = materializeOrder(snapshot?.order);
  } catch {
    return false;
  }
  if (!order || order.tenantId !== input.authenticatedTenantId || order.status !== "open") return false;

  const written = await withWritableDb(input, ["orders"], async (database) => {
    const existing = await database.orders.get(order.id);
    if (existing && existing.status !== "open") return false;
    await database.orders.put(order);
    return true;
  });
  if (written === true) notifyDexieTabWrite({ tenantId: input.authenticatedTenantId, kind: "edit" });
  return written === true;
}

export async function persistAfterSend(
  input: DexiePersistInput,
  snapshot: { order: Order; expectedOpen: Order; audit: AuditEntry },
): Promise<PersistResult> {
  let order: Order | null = null;
  let expectedOpen: Order | null = null;
  let audit: AuditEntry | null = null;
  try {
    order = materializeOrder(snapshot?.order);
    expectedOpen = materializeOrder(snapshot?.expectedOpen);
    audit = canonicalAudit(snapshot?.audit);
  } catch {
    return false;
  }
  if (
    !order
    || !expectedOpen
    || !audit
    || order.tenantId !== input.authenticatedTenantId
    || expectedOpen.tenantId !== input.authenticatedTenantId
    || audit.tenantId !== input.authenticatedTenantId
    || order.status !== "sent"
    || expectedOpen.status !== "open"
    || expectedOpen.id !== order.id
    || expectedOpen.tableId !== order.tableId
    || expectedOpen.staffId !== order.staffId
    || !Number.isSafeInteger(order.sentAt)
    || (order.sentAt as number) < order.createdAt
    || order.items.length === 0
    || audit.id !== `send:${order.id}`
    || audit.action !== "order.sent"
    || audit.entityType !== "order"
    || audit.entityId !== order.id
    || audit.staffId !== order.staffId
    || audit.timestamp !== order.sentAt
    || !sameJson(audit.details, { sentAt: order.sentAt })
  ) return false;

  const written = await withWritableDb(input, ["orders", "auditLog"], async (database) => {
    const existing = await database.orders.get(order.id);
    if (!existing) return false;
    const existingOrder = materializeOrder(existing);
    if (!existingOrder || existingOrder.tenantId !== order.tenantId || existingOrder.tableId !== order.tableId) return false;
    if (existingOrder.status === "open") {
      if (!sameJson(existingOrder, expectedOpen)) return false;
    } else if (existingOrder.status === "sent") {
      if (!sameJson(existingOrder, order)) return false;
    } else {
      return false;
    }
    const existingAudit = await database.auditLog.get(audit.id);
    if (existingAudit && !sameJson(canonicalAudit(existingAudit), audit)) return false;
    await database.orders.put(order);
    await database.auditLog.put(audit);
    return true;
  });
  if (written === true) notifyDexieTabWrite({ tenantId: input.authenticatedTenantId, kind: "edit" });
  return written === true;
}

async function withPayDb<T>(
  input: DexiePersistInput,
  write: (database: PosDatabase) => Promise<T>,
): Promise<T | { kind: "io-error" } | { kind: "invalid" }> {
  if (!persistSession || !input || !isPrimitiveNonemptyString(input.authenticatedTenantId)) return { kind: "invalid" };
  try {
    const database = new PosDatabase(input.databaseName ?? "small-pos");
    try {
      await database.open();
      return await database.transaction("rw", ["tables", "orders", "payments", "auditLog"], async () => write(database));
    } finally {
      database.close();
    }
  } catch {
    return { kind: "io-error" };
  }
}

export async function loadDurablePaySnapshot(
  input: DexiePersistInput,
  ids: { tableId: string; orderId: string },
): Promise<DurablePayLoad | null> {
  if (!isPrimitiveNonemptyString(input.authenticatedTenantId) || !isPrimitiveNonemptyString(ids.tableId) || !isPrimitiveNonemptyString(ids.orderId)) {
    return null;
  }
  try {
    const database = new PosDatabase(input.databaseName ?? "small-pos");
    try {
      await database.open();
      return await database.transaction("r", ["tables", "orders", "payments", "auditLog"], async () => {
        const table = materializeTable(await database.table<PosTable>("tables").get(ids.tableId));
        if (!table || table.tenantId !== input.authenticatedTenantId) return null;
        const rawOrder = await database.orders.get(ids.orderId);
        const order = rawOrder === undefined ? null : materializeOrder(rawOrder);
        if (rawOrder !== undefined && (!order || order.tenantId !== input.authenticatedTenantId)) return { kind: "corrupt" as const };
        const rawPayments = await database.payments.where("orderId").equals(ids.orderId).toArray();
        const payments: Payment[] = [];
        for (const raw of rawPayments) {
          const payment = materializePayment(raw);
          if (!payment || payment.tenantId !== input.authenticatedTenantId) return { kind: "corrupt" as const };
          payments.push(payment);
        }
        const rawAudits = await database.auditLog.toArray();
        const audits: AuditEntry[] = [];
        for (const raw of rawAudits) {
          const record = raw as { entityId?: unknown; action?: unknown; id?: unknown };
          const relatedByEntity = record.entityId === ids.orderId;
          const relatedById = typeof record.id === "string" && (
            record.id === `send:${ids.orderId}`
            || payments.some((payment) => record.id === `payment:${payment.id}`)
          );
          if (!relatedByEntity && !relatedById) continue;
          const audit = canonicalAudit(raw);
          if (!audit || audit.tenantId !== input.authenticatedTenantId || audit.entityId !== ids.orderId) {
            return { kind: "corrupt" as const };
          }
          if (audit.action === "payment.recorded" || audit.action === "order.sent") audits.push(audit);
        }
        return { kind: "ok" as const, table, order, payments, audits };
      });
    } finally {
      database.close();
    }
  } catch {
    return null;
  }
}

const cashChange = (tender: number, amount: number): number | null => {
  const change = tender - amount;
  return Number.isSafeInteger(change) && change >= 0 ? change : null;
};

export async function persistAfterPay(
  input: DexiePersistInput,
  snapshot: { table: PosTable; order: Order; payment: Payment; audit: AuditEntry; expectedPredecessor: Order },
): Promise<PayPersistOutcome> {
  let table: PosTable | null = null;
  let order: Order | null = null;
  let payment: Payment | null = null;
  let audit: AuditEntry | null = null;
  let expectedPredecessor: Order | null = null;
  try {
    table = materializeTable(snapshot?.table);
    order = materializeOrder(snapshot?.order);
    payment = materializePayment(snapshot?.payment);
    audit = canonicalAudit(snapshot?.audit);
    expectedPredecessor = materializeOrder(snapshot?.expectedPredecessor);
  } catch {
    return { kind: "invalid" };
  }
  const tenderOk = payment && Number.isSafeInteger(payment.tender) && (payment.tender as number) >= 0;
  const change = payment && order && tenderOk
    ? (payment.method === "cash" ? cashChange(payment.tender as number, order.total) : (payment.tender === order.total ? 0 : null))
    : null;
  if (
    !table
    || !order
    || !payment
    || !audit
    || !expectedPredecessor
    || !tenderOk
    || change === null
    || order.tenantId !== input.authenticatedTenantId
    || payment.tenantId !== input.authenticatedTenantId
    || audit.tenantId !== input.authenticatedTenantId
    || expectedPredecessor.tenantId !== input.authenticatedTenantId
    || order.status !== "paid"
    || !Number.isSafeInteger(order.paidAt)
    || payment.orderId !== order.id
    || order.tableId !== table.id
    || expectedPredecessor.id !== order.id
    || expectedPredecessor.tableId !== order.tableId
    || expectedPredecessor.staffId !== order.staffId
    || (expectedPredecessor.status !== "open" && expectedPredecessor.status !== "sent")
    || table.tenantId !== input.authenticatedTenantId
    || (
      table.status !== "empty"
      && !(table.status === "occupied" && table.currentOrderId === order.id)
    )
    || audit.id !== `payment:${payment.id}`
    || audit.action !== "payment.recorded"
    || audit.entityType !== "order"
    || audit.entityId !== order.id
    || audit.staffId !== payment.staffId
    || payment.staffId !== order.staffId
    || audit.timestamp !== payment.createdAt
    || order.paidAt !== payment.createdAt
    || payment.amount !== order.total
    || (payment.method === "cash" ? (payment.tender as number) < payment.amount : payment.tender !== payment.amount)
    || !sameJson(audit.details, {
      paymentId: payment.id,
      method: payment.method,
      paidTotal: order.total,
      tender: payment.tender,
      change,
    })
  ) return { kind: "invalid" };

  const written = await withPayDb(input, async (database) => {
    const existingTable = materializeTable(await database.table<PosTable>("tables").get(table.id));
    const existingOrder = materializeOrder(await database.orders.get(order.id));
    const orderPayments = (await database.payments.where("orderId").equals(order.id).toArray())
      .map(materializePayment);
    if (orderPayments.some((row) => !row)) return { kind: "conflict" as const };
    const existingAudit = canonicalAudit(await database.auditLog.get(audit.id));
    if (!existingTable || !existingOrder) return { kind: "conflict" as const };
    if (existingTable.tenantId !== order.tenantId || existingOrder.tenantId !== order.tenantId) return { kind: "conflict" as const };
    if (existingOrder.tableId !== order.tableId) return { kind: "conflict" as const };
    if (existingOrder.status === "cancelled") return { kind: "conflict" as const };
    const sameIdElsewhere = await database.payments.get(payment.id);
    if (sameIdElsewhere && sameIdElsewhere.orderId !== payment.orderId) return { kind: "conflict" as const };
    if (sameIdElsewhere && !sameJson(materializePayment(sameIdElsewhere), payment)) return { kind: "conflict" as const };

    if (existingOrder.status === "open" || existingOrder.status === "sent") {
      if (!sameJson(existingOrder, expectedPredecessor)) return { kind: "conflict" as const };
      if (existingTable.status !== "occupied" || existingTable.currentOrderId !== order.id) return { kind: "conflict" as const };
      if (orderPayments.length > 0 || existingAudit) return { kind: "conflict" as const };
      await database.orders.put(order);
      await database.payments.put(payment);
      await database.posTables.put(table);
      await database.auditLog.put(audit);
      return { kind: "committed" as const };
    }

    if (existingOrder.status === "paid") {
      if (!sameJson(existingOrder, order)) return { kind: "conflict" as const };
      if (orderPayments.length !== 1 || !sameJson(orderPayments[0], payment)) return { kind: "conflict" as const };
      if (!existingAudit || !sameJson(existingAudit, audit)) return { kind: "conflict" as const };
      if (!sameJson(existingTable, table)) return { kind: "conflict" as const };
      return { kind: "idempotent" as const };
    }
    return { kind: "conflict" as const };
  });
  if (written.kind === "committed") notifyDexieTabWrite({ tenantId: input.authenticatedTenantId, kind: "pay" });
  return written;
}
