import { computeDiscount, computeSubtotal, computeTotal } from "./order-calc";

export type AppConfigRecord = {
  id: "product";
  tenantId: string;
  completedAt: number;
};

const ROLES = new Set(["manager", "cashier", "staff", "kitchen"]);
const TABLE_STATUSES = new Set(["empty", "occupied", "waiting_payment"]);
const ORDER_STATUSES = new Set(["open", "sent", "paid", "cancelled"]);
const PAYMENT_METHODS = new Set(["cash", "transfer", "card", "other"]);
const SALT_BYTES = 16;
const KEY_BYTES = 32;

export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const isNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const isSafeInteger = (value: unknown): value is number => Number.isSafeInteger(value);

export const isMoney = (value: unknown): value is number => isSafeInteger(value) && value >= 0;

export const isTableNumber = (value: unknown): value is number =>
  isSafeInteger(value) && value >= 1 && value <= 10;

function base64Encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function decodeStrictBase64(value: string): Uint8Array | null {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;
  try {
    const bin = atob(value);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return base64Encode(arr.buffer) === value ? arr : null;
  } catch {
    return null;
  }
}

export function isValidPinHash(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = value.split("$");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const salt = decodeStrictBase64(parts[1]);
  const key = decodeStrictBase64(parts[2]);
  return Boolean(salt && key && salt.length === SALT_BYTES && key.length === KEY_BYTES);
}

const uniqueIds = (rows: Array<{ id: unknown }>) =>
  new Set(rows.map((row) => row.id)).size === rows.length;

function isOwnDataGraph(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return typeof value !== "number" || Number.isFinite(value);
  }
  if (typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.every((entry) => isOwnDataGraph(entry, seen));
  if (!isPlainObject(value)) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(descriptors).every((key) => {
    const descriptor = descriptors[key as string];
    return Boolean(descriptor && "value" in descriptor && isOwnDataGraph(descriptor.value, seen));
  });
}

export function isTenantRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value) || !isOwnDataGraph(value)) return false;
  return isNonemptyString(value.id)
    && isNonemptyString(value.name)
    && isNonemptyString(value.address)
    && isNonemptyString(value.phone)
    && value.currency === "VND"
    && isMoney(value.defaultTax)
    && isMoney(value.defaultSurcharge)
    && isTableNumber(value.tableCount)
    && isSafeInteger(value.createdAt);
}

export function isStaffRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value) || !isOwnDataGraph(value)) return false;
  return isNonemptyString(value.id)
    && isNonemptyString(value.tenantId)
    && isNonemptyString(value.name)
    && typeof value.role === "string"
    && ROLES.has(value.role)
    && isValidPinHash(value.pinHash)
    && isSafeInteger(value.createdAt);
}

export function isAppConfigRecord(value: unknown): value is AppConfigRecord {
  if (!isPlainObject(value) || !isOwnDataGraph(value)) return false;
  return value.id === "product" && isNonemptyString(value.tenantId) && isSafeInteger(value.completedAt);
}

export function isPosTableRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value) || !isOwnDataGraph(value)) return false;
  return isNonemptyString(value.id)
    && isNonemptyString(value.tenantId)
    && isTableNumber(value.number)
    && typeof value.status === "string"
    && TABLE_STATUSES.has(value.status)
    && isNonemptyString(value.staffId)
    && isSafeInteger(value.openedAt)
    && (value.currentOrderId === undefined || isNonemptyString(value.currentOrderId));
}

export function isCatalogGroupRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value) || !isOwnDataGraph(value)) return false;
  return isNonemptyString(value.id)
    && isNonemptyString(value.tenantId)
    && isNonemptyString(value.name)
    && isSafeInteger(value.sortOrder);
}

export function isCatalogItemRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value) || !isOwnDataGraph(value)) return false;
  return isNonemptyString(value.id)
    && isNonemptyString(value.tenantId)
    && isNonemptyString(value.groupId)
    && isNonemptyString(value.name)
    && isMoney(value.price)
    && typeof value.available === "boolean"
    && isSafeInteger(value.sortOrder)
    && isSafeInteger(value.createdAt)
    && isSafeInteger(value.updatedAt)
    && (value.description === undefined || typeof value.description === "string")
    && (value.imageUrl === undefined || typeof value.imageUrl === "string");
}

export function isOrderItemRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value) || !isOwnDataGraph(value)) return false;
  return isNonemptyString(value.id)
    && isNonemptyString(value.orderId)
    && isNonemptyString(value.catalogItemId)
    && isNonemptyString(value.name)
    && isMoney(value.price)
    && isSafeInteger(value.quantity)
    && value.quantity > 0
    && (value.note === undefined || typeof value.note === "string")
    && (value.cancelledAt === undefined || isSafeInteger(value.cancelledAt))
    && (value.cancelReason === undefined || typeof value.cancelReason === "string");
}

export function isOrderRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value) || !isOwnDataGraph(value)) return false;
  if (!isNonemptyString(value.id)
    || !isNonemptyString(value.tenantId)
    || !isNonemptyString(value.tableId)
    || !isNonemptyString(value.staffId)
    || typeof value.status !== "string"
    || !ORDER_STATUSES.has(value.status)
    || !Array.isArray(value.items)
    || !isMoney(value.subtotal)
    || !isMoney(value.discount)
    || (value.discountType !== "amount" && value.discountType !== "percent")
    || !isMoney(value.total)
    || !isSafeInteger(value.createdAt)
    || (value.sentAt !== undefined && !isSafeInteger(value.sentAt))
    || (value.paidAt !== undefined && !isSafeInteger(value.paidAt))
    || (value.cancelledAt !== undefined && !isSafeInteger(value.cancelledAt))
    || (value.discountPercent !== undefined && !isMoney(value.discountPercent))
    || (value.discountType === "amount" && value.discountPercent !== undefined)
    || (value.discountType === "percent" && value.discountPercent === undefined)
    || (value.status === "open" && (value.sentAt !== undefined || value.paidAt !== undefined || value.cancelledAt !== undefined))
    || (value.status === "paid" && value.paidAt === undefined)
    || (value.status === "cancelled" && value.cancelledAt === undefined)
    || (value.status === "sent" && value.sentAt === undefined)
  ) return false;
  const items = value.items;
  if (!items.every(isOrderItemRecord) || !uniqueIds(items as Array<{ id: unknown }>)) return false;
  if (items.some((item) => (item as { orderId: string }).orderId !== value.id)) return false;
  try {
    const subtotal = computeSubtotal(items as Array<{ price: number; quantity: number; cancelledAt?: number }>);
    const discountValue = value.discountType === "percent" ? value.discountPercent : value.discount;
    return discountValue !== undefined
      && value.discount === computeDiscount(subtotal, value.discountType, discountValue)
      && value.subtotal === subtotal
      && value.total === computeTotal(subtotal, value.discount);
  } catch {
    return false;
  }
}

export function isPaymentRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value) || !isOwnDataGraph(value)) return false;
  if (!isNonemptyString(value.id)
    || !isNonemptyString(value.tenantId)
    || !isNonemptyString(value.orderId)
    || !isMoney(value.amount)
    || !isMoney(value.tender)
    || typeof value.method !== "string"
    || !PAYMENT_METHODS.has(value.method)
    || !isNonemptyString(value.staffId)
    || !isSafeInteger(value.createdAt)
    || (value.note !== undefined && typeof value.note !== "string")
  ) return false;
  return value.method === "cash" ? value.tender >= value.amount : value.tender === value.amount;
}

export function isShiftRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value) || !isOwnDataGraph(value)) return false;
  if (!isNonemptyString(value.id)
    || !isNonemptyString(value.tenantId)
    || !isNonemptyString(value.staffId)
    || !isMoney(value.openedAt)
    || !isMoney(value.openingCash)
    || (value.note !== undefined && typeof value.note !== "string")
  ) return false;
  const closed = value.closedAt !== undefined || value.closingCash !== undefined;
  if (!closed) return true;
  return isMoney(value.closedAt) && isMoney(value.closingCash) && value.closedAt >= value.openedAt;
}

export function isAuditRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value) || !isOwnDataGraph(value)) return false;
  if (!isNonemptyString(value.id)
    || !isNonemptyString(value.tenantId)
    || !isNonemptyString(value.staffId)
    || !isNonemptyString(value.action)
    || !isNonemptyString(value.entityType)
    || !isNonemptyString(value.entityId)
    || !isMoney(value.timestamp)
    || !isPlainObject(value.details)
    || !isOwnDataGraph(value.details)
  ) return false;
  try {
    JSON.stringify(value.details);
    return true;
  } catch {
    return false;
  }
}

export function isProductViableShopData(data: {
  tenants: unknown[];
  staff: unknown[];
  tables: unknown[];
  appConfig: unknown[];
  catalogGroups: unknown[];
  catalogItems: unknown[];
}): boolean {
  if (data.tenants.length !== 1 || data.appConfig.length !== 1) return false;
  const tenant = data.tenants[0];
  const config = data.appConfig[0];
  if (!isTenantRecord(tenant) || !isAppConfigRecord(config)) return false;
  if (config.tenantId !== tenant.id) return false;
  if (!data.staff.every(isStaffRecord) || !uniqueIds(data.staff as Array<{ id: unknown }>)) return false;
  if (data.staff.some((row) => (row as { tenantId: string }).tenantId !== tenant.id)) return false;
  if (!data.staff.some((row) => (row as { role: string }).role === "manager")) return false;
  if (!data.tables.every(isPosTableRecord) || !uniqueIds(data.tables as Array<{ id: unknown }>)) return false;
  if (data.tables.length !== tenant.tableCount) return false;
  if (data.tables.some((row) => (row as { tenantId: string }).tenantId !== tenant.id)) return false;
  if (new Set(data.tables.map((row) => (row as { number: number }).number)).size !== data.tables.length) return false;
  if (!data.catalogGroups.every(isCatalogGroupRecord) || !uniqueIds(data.catalogGroups as Array<{ id: unknown }>)) return false;
  if (data.catalogGroups.some((row) => (row as { tenantId: string }).tenantId !== tenant.id)) return false;
  const groupIds = new Set(data.catalogGroups.map((row) => (row as { id: string }).id));
  if (!data.catalogItems.every(isCatalogItemRecord) || !uniqueIds(data.catalogItems as Array<{ id: unknown }>)) return false;
  if (data.catalogItems.some((row) => {
    const item = row as { tenantId: string; groupId: string };
    return item.tenantId !== tenant.id || !groupIds.has(item.groupId);
  })) return false;
  return true;
}

export function isProductViableBackupData(data: {
  tenants: unknown[];
  staff: unknown[];
  tables: unknown[];
  appConfig: unknown[];
  catalogGroups: unknown[];
  catalogItems: unknown[];
  orders: unknown[];
  payments: unknown[];
  shifts: unknown[];
  auditLog: unknown[];
}): boolean {
  if (!isProductViableShopData(data)) return false;
  const tenantId = (data.tenants[0] as { id: string }).id;
  const staffIds = new Set(data.staff.map((row) => (row as { id: string }).id));
  const tableIds = new Set(data.tables.map((row) => (row as { id: string }).id));
  const catalogIds = new Set(data.catalogItems.map((row) => (row as { id: string }).id));
  if (data.tables.some((row) => !staffIds.has((row as { staffId: string }).staffId))) return false;
  if (!data.orders.every(isOrderRecord) || !uniqueIds(data.orders as Array<{ id: unknown }>)) return false;
  if (data.orders.some((row) => {
    const order = row as { tenantId: string; tableId: string; staffId: string; items: Array<{ catalogItemId: string }> };
    return order.tenantId !== tenantId
      || !tableIds.has(order.tableId)
      || !staffIds.has(order.staffId)
      || order.items.some((item) => !catalogIds.has(item.catalogItemId));
  })) return false;
  const ordersById = new Map(data.orders.map((row) => [(row as { id: string }).id, row as Record<string, unknown>]));
  if (data.tables.some((row) => {
    const table = row as { status: string; currentOrderId?: string; id: string; tenantId: string };
    if (table.status === "empty") return table.currentOrderId !== undefined;
    if (table.status !== "occupied" && table.status !== "waiting_payment") return true;
    if (!table.currentOrderId) return true;
    const order = ordersById.get(table.currentOrderId);
    return !order
      || order.tenantId !== table.tenantId
      || order.tableId !== table.id
      || order.status === "paid"
      || order.status === "cancelled";
  })) return false;
  if (data.orders.filter((row) => (row as { status: string }).status === "open").some((row) => {
    const order = row as { id: string; tableId: string };
    return !data.tables.some((table) => {
      const bound = table as { id: string; currentOrderId?: string; status: string };
      return bound.id === order.tableId
        && bound.currentOrderId === order.id
        && (bound.status === "occupied" || bound.status === "waiting_payment");
    });
  })) return false;
  if (!data.payments.every(isPaymentRecord) || !uniqueIds(data.payments as Array<{ id: unknown }>)) return false;
  if (data.payments.some((row) => {
    const payment = row as { tenantId: string; orderId: string; staffId: string; amount: number };
    const order = ordersById.get(payment.orderId);
    return payment.tenantId !== tenantId
      || !staffIds.has(payment.staffId)
      || !order
      || order.tenantId !== payment.tenantId
      || order.status !== "paid"
      || order.total !== payment.amount;
  })) return false;
  const paidIds = data.orders.filter((row) => (row as { status: string }).status === "paid").map((row) => (row as { id: string }).id);
  if (paidIds.some((id) => data.payments.filter((row) => (row as { orderId: string }).orderId === id).length !== 1)) return false;
  if (!data.shifts.every(isShiftRecord) || !uniqueIds(data.shifts as Array<{ id: unknown }>)) return false;
  if (data.shifts.some((row) => {
    const shift = row as { tenantId: string; staffId: string };
    return shift.tenantId !== tenantId || !staffIds.has(shift.staffId);
  })) return false;
  if (data.shifts.filter((row) => (row as { closedAt?: number }).closedAt === undefined).length > 1) return false;
  if (!data.auditLog.every(isAuditRecord) || !uniqueIds(data.auditLog as Array<{ id: unknown }>)) return false;
  if (data.auditLog.some((row) => {
    const audit = row as { tenantId: string; staffId: string };
    return audit.tenantId !== tenantId || !staffIds.has(audit.staffId);
  })) return false;
  return true;
}
