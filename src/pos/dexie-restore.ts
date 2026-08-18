import { PosDatabase } from "../../packages/pos-storage/src/db";
import { computeDiscount, computeSubtotal, computeTotal } from "../../packages/pos-core/src/order-calc";
import type { AuditEntry, Order, OrderItem, PosTable } from "../../packages/pos-core/src/types";
import { isAuditRecord } from "../../packages/pos-core/src/product-records";

export type DexieRestoreInput = {
  authenticatedTenantId: string;
  databaseName?: string;
};

export type TableOrderBind =
  | "ok"
  | "missing-order"
  | "paid-occupied"
  | "status-mismatch"
  | "table-mismatch"
  | "tenant-mismatch"
  | "duplicate-open"
  | "invalid-record";

const isPrimitiveNonemptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
const isMoney = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const isDiscountType = (value: unknown): value is "amount" | "percent" => value === "amount" || value === "percent";

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

const materializeOpenOrder = (value: unknown): Order | null => {
  let order: Record<string, unknown> | null = null;
  try {
    order = materializeRecord(value);
  } catch {
    return null;
  }
  if (
    !order
    || !isPrimitiveNonemptyString(order.id)
    || !isPrimitiveNonemptyString(order.tenantId)
    || !isPrimitiveNonemptyString(order.tableId)
    || !isPrimitiveNonemptyString(order.staffId)
    || (order.status !== "open" && order.status !== "sent")
    || Object.hasOwn(order, "paidAt")
    || Object.hasOwn(order, "cancelledAt")
    || !Array.isArray(order.items)
    || !isMoney(order.subtotal)
    || !isMoney(order.discount)
    || !isDiscountType(order.discountType)
    || !isMoney(order.total)
    || !Number.isSafeInteger(order.createdAt)
    || (order.discountPercent !== undefined && !isMoney(order.discountPercent))
    || (order.discountType === "amount" && order.discountPercent !== undefined)
  ) return null;
  const createdAt = order.createdAt as number;
  if (order.status === "open" && Object.hasOwn(order, "sentAt")) return null;
  if (order.status === "sent" && (!Number.isSafeInteger(order.sentAt) || (order.sentAt as number) < createdAt)) return null;
  const items = order.items.map(materializeRecord);
  if (items.some((item) => !item || !isOrderItem(item))) return null;
  const validOrder: Order = {
    id: order.id,
    tenantId: order.tenantId,
    tableId: order.tableId,
    staffId: order.staffId,
    status: order.status,
    items: (items as (Record<string, unknown> & OrderItem)[]).map(canonicalItem),
    subtotal: order.subtotal,
    discount: order.discount,
    discountType: order.discountType,
    total: order.total,
    createdAt,
    ...(order.discountPercent !== undefined ? { discountPercent: order.discountPercent } : {}),
    ...(order.status === "sent" ? { sentAt: order.sentAt as number } : {}),
  };
  try {
    const subtotal = computeSubtotal(validOrder.items);
    const discountValue = validOrder.discountType === "percent" ? validOrder.discountPercent : validOrder.discount;
    return discountValue !== undefined
      && validOrder.discount === computeDiscount(subtotal, validOrder.discountType, discountValue)
      && validOrder.subtotal === subtotal
      && validOrder.total === computeTotal(subtotal, validOrder.discount)
      ? validOrder
      : null;
  } catch {
    return null;
  }
};

export function classifyTableOrderBind(
  table: PosTable,
  order: Order | null,
  extras?: { openOrdersForTable: Order[] },
): TableOrderBind {
  if (extras && extras.openOrdersForTable.length > 1) return "duplicate-open";
  if (order === null) return "missing-order";
  if (order.tenantId !== table.tenantId) return "tenant-mismatch";
  if (order.tableId !== table.id) return "table-mismatch";
  if (table.status !== "occupied" && table.status !== "waiting_payment") return "status-mismatch";
  if (order.status === "paid") return "paid-occupied";
  if (order.status !== "open" && order.status !== "sent") return "status-mismatch";
  return "ok";
}

export async function loadOpenOrderForTable(
  input: DexieRestoreInput,
  ref: { tableId: string; expectedOrderId: string },
): Promise<Order | null> {
  try {
    if (
      !input
      || !ref
      || !isPrimitiveNonemptyString(input.authenticatedTenantId)
      || !isPrimitiveNonemptyString(ref.tableId)
      || !isPrimitiveNonemptyString(ref.expectedOrderId)
    ) return null;
    const database = new PosDatabase(input.databaseName ?? "small-pos");
    try {
      await database.open();
      const snapshot = await database.transaction("r", ["orders"], async () => ({
        order: await database.orders.get(ref.expectedOrderId),
        sameTable: await database.orders.where("tableId").equals(ref.tableId).toArray(),
      }));
      const order = materializeOpenOrder(snapshot.order);
      if (
        !order
        || order.tenantId !== input.authenticatedTenantId
        || order.id !== ref.expectedOrderId
        || order.tableId !== ref.tableId
      ) return null;
      let openCount = 0;
      for (const raw of snapshot.sameTable) {
        let record: Record<string, unknown> | null = null;
        try {
          record = materializeRecord(raw);
        } catch {
          return null;
        }
        if (!record) return null;
        if (record.status === "open" || record.status === "sent") openCount += 1;
      }
      return openCount === 1 ? order : null;
    } finally {
      database.close();
    }
  } catch {
    return null;
  }
}

export async function loadRestoredOrderForTable(
  input: DexieRestoreInput,
  ref: { tableId: string; expectedOrderId: string },
): Promise<{ order: Order; audits: AuditEntry[] } | null> {
  try {
    if (
      !input
      || !ref
      || !isPrimitiveNonemptyString(input.authenticatedTenantId)
      || !isPrimitiveNonemptyString(ref.tableId)
      || !isPrimitiveNonemptyString(ref.expectedOrderId)
    ) return null;
    const database = new PosDatabase(input.databaseName ?? "small-pos");
    try {
      await database.open();
      const snapshot = await database.transaction("r", ["orders", "auditLog"], async () => ({
        order: await database.orders.get(ref.expectedOrderId),
        sameTable: await database.orders.where("tableId").equals(ref.tableId).toArray(),
        audits: await database.auditLog.where("tenantId").equals(input.authenticatedTenantId).toArray(),
      }));
      const order = materializeOpenOrder(snapshot.order);
      if (
        !order
        || order.tenantId !== input.authenticatedTenantId
        || order.id !== ref.expectedOrderId
        || order.tableId !== ref.tableId
      ) return null;
      let openCount = 0;
      for (const raw of snapshot.sameTable) {
        const record = materializeRecord(raw);
        if (!record) return null;
        if (record.status === "open" || record.status === "sent") openCount += 1;
      }
      if (openCount !== 1) return null;
      const audits: AuditEntry[] = [];
      for (const raw of snapshot.audits) {
        const record = materializeRecord(raw);
        const related = record && (
          record.entityId === order.id
          || (typeof record.id === "string" && (record.id === `send:${order.id}` || String(record.id).startsWith("payment:")))
        );
        if (!related) continue;
        if (!record || !isAuditRecord(record) || record.entityType !== "order" || record.entityId !== order.id) return null;
        audits.push({
          id: record.id as string,
          tenantId: record.tenantId as string,
          staffId: record.staffId as string,
          action: record.action as string,
          entityType: record.entityType as string,
          entityId: record.entityId as string,
          details: { ...(record.details as Record<string, unknown>) },
          timestamp: record.timestamp as number,
        });
      }
      const sendAudits = audits.filter((entry) => entry.action === "order.sent");
      if (order.status === "sent") {
        if (sendAudits.length !== 1) return null;
        const send = sendAudits[0];
        if (
          send.id !== `send:${order.id}`
          || send.timestamp !== order.sentAt
          || send.staffId !== order.staffId
          || send.tenantId !== order.tenantId
          || JSON.stringify(send.details) !== JSON.stringify({ sentAt: order.sentAt })
        ) return null;
      } else if (sendAudits.length !== 0) {
        return null;
      }
      if (audits.some((entry) => entry.action === "payment.recorded")) return null;
      audits.sort((left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id));
      return { order, audits };
    } finally {
      database.close();
    }
  } catch {
    return null;
  }
}
