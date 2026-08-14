import { PosDatabase } from "../../packages/pos-storage/src/db";
import type { Order, OrderItem, Payment, PosTable } from "../../packages/pos-core/src/types";

export type DexiePersistInput = {
  authenticatedTenantId: string;
  databaseName?: string;
};

export type PersistResult = true | false;

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
    await database.posTables.put(table);
    await database.orders.put(order);
    return true;
  });
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
    await database.orders.put(order);
    return true;
  });
  return written === true;
}

export async function persistAfterPay(
  input: DexiePersistInput,
  snapshot: { table: PosTable; order: Order; payment: Payment },
): Promise<PersistResult> {
  let table: PosTable | null = null;
  let order: Order | null = null;
  let payment: Payment | null = null;
  try {
    table = materializeTable(snapshot?.table);
    order = materializeOrder(snapshot?.order);
    payment = materializePayment(snapshot?.payment);
  } catch {
    return false;
  }
  const tableOk = table
    && table.tenantId === input.authenticatedTenantId
    && (
      table.status === "empty"
      || (table.status === "occupied" && table.currentOrderId === order?.id)
    );
  if (
    !table
    || !order
    || !payment
    || !tableOk
    || order.tenantId !== input.authenticatedTenantId
    || payment.tenantId !== input.authenticatedTenantId
    || order.status !== "paid"
    || payment.orderId !== order.id
    || order.tableId !== table.id
  ) return false;

  const written = await withWritableDb(input, ["tables", "orders", "payments"], async (database) => {
    await database.orders.put(order);
    await database.payments.put(payment);
    await database.posTables.put(table);
    return true;
  });
  return written === true;
}
