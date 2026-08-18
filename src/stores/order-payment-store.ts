import { create } from "zustand";
import { computeDiscount, computeSubtotal, computeTotal } from "../../packages/pos-core/src/order-calc";
import type { AuditEntry, Order, OrderItem, Payment, PaymentReceipt } from "../../packages/pos-core/src/types";
import { isAuditRecord } from "../../packages/pos-core/src/product-records";
import { registerSessionClear } from "./session-hooks";
import { useTenantAuthStore } from "./tenant-auth-store";

type DiscountType = Order["discountType"];
type OrderPaymentState = {
  currentOrder: Order | null;
  payments: Payment[];
  auditEntries: AuditEntry[];
  /** Populated after a successful recordPayment; null otherwise. Read by UI to show receipt. */
  lastReceipt: PaymentReceipt | null;
  createOpenOrder: (order: unknown) => boolean;
  selectOpenOrder: (order: unknown) => boolean;
  clearCurrentOrder: () => void;
  clearSessionState: () => void;
  addItem: (item: unknown) => boolean;
  updateItemQuantity: (id: unknown, quantity: unknown) => boolean;
  removeItem: (id: unknown) => boolean;
  setDiscount: (type: unknown, value: unknown) => boolean;
  sendToKitchen: (sentAt: unknown) => boolean;
  revertSendToKitchen: (expectedSentAt: unknown) => boolean;
  revertUnpersistedPayment: (input: unknown) => boolean;
  applyDurablePaySnapshot: (input: unknown) => boolean;
  applyRestoredOpenOrder: (order: unknown, audits: unknown) => boolean;
  restoreOwnedPayState: (input: unknown) => boolean;
  recordPayment: (payment: unknown) => boolean;
};

const isNonemptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isSafeInteger = (value: unknown): value is number => Number.isSafeInteger(value);
const isMoney = (value: unknown): value is number => isSafeInteger(value) && value >= 0;
const isPlainObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
const isDiscountType = (value: unknown): value is DiscountType => value === "amount" || value === "percent";

const materializeRecord = (value: unknown): Record<string, unknown> | null => {
  try {
    if (!isPlainObject(value)) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => !("value" in descriptors[key as keyof typeof descriptors]))) return null;
    return Object.fromEntries(Reflect.ownKeys(descriptors).map((key) => [key, descriptors[key as keyof typeof descriptors].value]));
  } catch { return null; }
};

const isOrderItem = (value: Record<string, unknown>): value is Record<string, unknown> & OrderItem =>
  isNonemptyString(value.id) && isNonemptyString(value.orderId) && isNonemptyString(value.catalogItemId)
  && isNonemptyString(value.name) && isMoney(value.price) && isSafeInteger(value.quantity) && value.quantity > 0
  && (value.note === undefined || typeof value.note === "string")
  && (value.cancelledAt === undefined || isSafeInteger(value.cancelledAt))
  && (value.cancelReason === undefined || typeof value.cancelReason === "string");
const isPayment = (value: Record<string, unknown>): value is Record<string, unknown> & Payment =>
  isNonemptyString(value.id) && isNonemptyString(value.tenantId) && isNonemptyString(value.orderId)
  && isMoney(value.amount) && isMoney(value.tender) && (value.method === "cash" || value.method === "transfer" || value.method === "card" || value.method === "other")
  && isNonemptyString(value.staffId) && isSafeInteger(value.createdAt) && (value.note === undefined || typeof value.note === "string");
const canonicalItem = (item: OrderItem): OrderItem => ({
  id: item.id, orderId: item.orderId, catalogItemId: item.catalogItemId, name: item.name, price: item.price, quantity: item.quantity,
  ...(item.note !== undefined ? { note: item.note } : {}),
  ...(item.cancelledAt !== undefined ? { cancelledAt: item.cancelledAt } : {}),
  ...(item.cancelReason !== undefined ? { cancelReason: item.cancelReason } : {}),
});
const canonicalPayment = (payment: Payment): Payment => ({
  id: payment.id, tenantId: payment.tenantId, orderId: payment.orderId, amount: payment.amount, tender: payment.tender, method: payment.method, staffId: payment.staffId, createdAt: payment.createdAt,
  ...(payment.note !== undefined ? { note: payment.note } : {}),
});
const freezeAuditEntries = (entries: AuditEntry[]): AuditEntry[] => Object.freeze(entries.map((entry) => Object.freeze({ ...entry, details: Object.freeze({ ...entry.details }) }))) as AuditEntry[];

const materializeOpenOrder = (value: unknown): Order | null => {
  const order = materializeRecord(value);
  if (!order || !isNonemptyString(order.id) || !isNonemptyString(order.tenantId) || !isNonemptyString(order.tableId) || !isNonemptyString(order.staffId)
    || (order.status !== "open" && order.status !== "sent") || Object.hasOwn(order, "paidAt") || Object.hasOwn(order, "cancelledAt")
    || !Array.isArray(order.items) || !isMoney(order.subtotal) || !isMoney(order.discount) || !isDiscountType(order.discountType) || !isMoney(order.total)
    || !isSafeInteger(order.createdAt) || (order.discountPercent !== undefined && !isMoney(order.discountPercent))
    || (order.discountType === "amount" && order.discountPercent !== undefined)
    || (order.status === "open" && Object.hasOwn(order, "sentAt"))
    || (order.status === "sent" && (!isSafeInteger(order.sentAt) || order.sentAt < order.createdAt))) return null;
  const items = order.items.map(materializeRecord);
  if (items.some((item) => !item || !isOrderItem(item))) return null;
  const validOrder = {
    id: order.id, tenantId: order.tenantId, tableId: order.tableId, staffId: order.staffId, status: order.status,
    items: (items as (Record<string, unknown> & OrderItem)[]).map(canonicalItem), subtotal: order.subtotal, discount: order.discount,
    discountType: order.discountType, total: order.total, createdAt: order.createdAt,
    ...(order.discountPercent !== undefined ? { discountPercent: order.discountPercent } : {}),
    ...(order.status === "sent" ? { sentAt: order.sentAt as number } : {}),
  } as Order;
  try {
    const subtotal = computeSubtotal(validOrder.items);
    const discountValue = validOrder.discountType === "percent" ? validOrder.discountPercent : validOrder.discount;
    return discountValue !== undefined && validOrder.discount === computeDiscount(subtotal, validOrder.discountType, discountValue) && validOrder.subtotal === subtotal && validOrder.total === computeTotal(subtotal, validOrder.discount) ? validOrder : null;
  } catch { return null; }
};

const freezeOrder = (order: Order): Order => {
  const items = order.items.map((item) => Object.freeze({ ...item }));
  return Object.freeze({ ...order, items: Object.freeze(items) }) as Order;
};
const freezePayments = (payments: Payment[]): Payment[] => Object.freeze(payments.map((payment) => Object.freeze({ ...payment }))) as Payment[];
const recalculated = (order: Order, type: DiscountType, value: number): Order => {
  const subtotal = computeSubtotal(order.items);
  const discount = computeDiscount(subtotal, type, value);
  const { discountPercent: _, ...withoutDiscountPercent } = order;
  return { ...withoutDiscountPercent, subtotal, discount, total: computeTotal(subtotal, discount), discountType: type, ...(type === "percent" ? { discountPercent: value } : {}) };
};

export const useOrderPaymentStore = create<OrderPaymentState>((set, get) => ({
  currentOrder: null,
  payments: freezePayments([]),
  auditEntries: freezeAuditEntries([]),
  lastReceipt: null,
  createOpenOrder: (order) => {
    const validOrder = materializeOpenOrder(order);
    return Boolean(validOrder && validOrder.status === "open" && !get().currentOrder && get().selectOpenOrder(validOrder));
  },
  selectOpenOrder: (order) => {
    try {
      const validOrder = materializeOpenOrder(order);
      if (!validOrder) return false;
      set({ currentOrder: freezeOrder(validOrder) });
      return true;
    } catch { return false; }
  },
  clearCurrentOrder: () => set({ currentOrder: null }),
  clearSessionState: () => set({
    currentOrder: null,
    payments: Object.freeze([]) as unknown as Payment[],
    auditEntries: Object.freeze([]) as unknown as AuditEntry[],
    lastReceipt: null,
  }),
  addItem: (item) => {
    try {
      const order = get().currentOrder;
      const validItem = materializeRecord(item);
      if (!order || order.status !== "open" || !validItem || !isOrderItem(validItem) || validItem.orderId !== order.id || order.items.some(({ id }) => id === validItem.id)) return false;
      set({ currentOrder: freezeOrder(recalculated({ ...order, items: [...order.items, canonicalItem(validItem)] }, order.discountType, order.discountType === "percent" ? order.discountPercent ?? 0 : order.discount)) });
      return true;
    } catch { return false; }
  },
  updateItemQuantity: (id, quantity) => {
    try {
      const order = get().currentOrder;
      if (!order || order.status !== "open" || !isNonemptyString(id) || !isSafeInteger(quantity) || quantity <= 0 || !order.items.some((item) => item.id === id)) return false;
      set({ currentOrder: freezeOrder(recalculated({ ...order, items: order.items.map((item) => item.id === id ? { ...item, quantity } : item) }, order.discountType, order.discountType === "percent" ? order.discountPercent ?? 0 : order.discount)) });
      return true;
    } catch { return false; }
  },
  removeItem: (id) => {
    const order = get().currentOrder;
    if (!order || order.status !== "open" || !isNonemptyString(id) || !order.items.some((item) => item.id === id)) return false;
    try {
      set({ currentOrder: freezeOrder(recalculated({ ...order, items: order.items.filter((item) => item.id !== id) }, order.discountType, order.discountType === "percent" ? order.discountPercent ?? 0 : order.discount)) });
      return true;
    } catch { return false; }
  },
  setDiscount: (type, value) => {
    try {
      const order = get().currentOrder;
      if (!order || order.status !== "open" || !isDiscountType(type) || !isMoney(value)) return false;
      set({ currentOrder: freezeOrder(recalculated(order, type, value)) });
      return true;
    } catch { return false; }
  },
  sendToKitchen: (sentAt) => {
    try {
      const order = get().currentOrder;
      if (!order || order.status !== "open" || order.items.length === 0 || !isSafeInteger(sentAt) || sentAt < order.createdAt) return false;
      const staff = useTenantAuthStore.getState().staff;
      if (!staff || staff.tenantId !== order.tenantId || staff.id !== order.staffId || !useTenantAuthStore.getState().can("order.send")) return false;
      const audit: AuditEntry = {
        id: `send:${order.id}`,
        tenantId: order.tenantId,
        staffId: order.staffId,
        action: "order.sent",
        entityType: "order",
        entityId: order.id,
        details: { sentAt },
        timestamp: sentAt,
      };
      set({
        currentOrder: freezeOrder({ ...order, status: "sent", sentAt }),
        auditEntries: freezeAuditEntries([...get().auditEntries, audit]),
      });
      return true;
    } catch { return false; }
  },
  revertSendToKitchen: (expectedSentAt) => {
    const order = get().currentOrder;
    if (!order || order.status !== "sent" || !isSafeInteger(expectedSentAt) || order.sentAt !== expectedSentAt) return false;
    const { sentAt: _, ...open } = order;
    set({
      currentOrder: freezeOrder({ ...open, status: "open" }),
      auditEntries: freezeAuditEntries(get().auditEntries.filter((entry) => entry.id !== `send:${order.id}`)),
    });
    return true;
  },
  revertUnpersistedPayment: (input) => {
    const raw = materializeRecord(input);
    const order = get().currentOrder;
    if (!raw || !order || order.status !== "paid" || !isNonemptyString(raw.paymentId)) return false;
    const predecessor = materializeOpenOrder(raw.predecessor);
    if (!predecessor || predecessor.id !== order.id || predecessor.tenantId !== order.tenantId) return false;
    const staff = useTenantAuthStore.getState().staff;
    if (!staff || staff.tenantId !== order.tenantId || !useTenantAuthStore.getState().can("payment.record")) return false;
    if (!get().payments.some((payment) => payment.id === raw.paymentId && payment.orderId === order.id)) return false;
    set({
      currentOrder: freezeOrder(predecessor),
      payments: freezePayments(get().payments.filter((payment) => payment.id !== raw.paymentId)),
      auditEntries: freezeAuditEntries(get().auditEntries.filter((entry) => entry.id !== `payment:${raw.paymentId}`)),
      lastReceipt: null,
    });
    return true;
  },
  applyDurablePaySnapshot: (input) => {
    const raw = materializeRecord(input);
    if (!raw) return false;
    const orderRecord = materializeRecord(raw.order);
    if (!orderRecord || !isNonemptyString(orderRecord.id) || !isNonemptyString(orderRecord.tenantId)) return false;
    if (raw.payments !== undefined && !Array.isArray(raw.payments)) return false;
    if (raw.audits !== undefined && !Array.isArray(raw.audits)) return false;
    const payments = Array.isArray(raw.payments)
      ? raw.payments.map((row) => materializeRecord(row)).filter((row): row is Record<string, unknown> => Boolean(row && isPayment(row))).map((row) => canonicalPayment(row as unknown as Payment))
      : [];
    if (Array.isArray(raw.payments) && payments.length !== raw.payments.length) return false;
    const audits = Array.isArray(raw.audits)
      ? raw.audits.map((row) => {
        if (!isAuditRecord(row)) return null;
        return {
          id: row.id as string,
          tenantId: row.tenantId as string,
          staffId: row.staffId as string,
          action: row.action as string,
          entityType: row.entityType as string,
          entityId: row.entityId as string,
          details: { ...(row.details as Record<string, unknown>) },
          timestamp: row.timestamp as number,
        } as AuditEntry;
      })
      : [];
    if (Array.isArray(raw.audits) && audits.some((row) => !row)) return false;
    if (orderRecord.status === "paid") {
      if (!isSafeInteger(orderRecord.paidAt) || payments.length !== 1 || payments[0].orderId !== orderRecord.id) return false;
      set({
        currentOrder: freezeOrder({
          id: orderRecord.id as string,
          tenantId: orderRecord.tenantId as string,
          tableId: orderRecord.tableId as string,
          staffId: orderRecord.staffId as string,
          status: "paid",
          items: Array.isArray(orderRecord.items) ? orderRecord.items as Order["items"] : [],
          subtotal: orderRecord.subtotal as number,
          discount: orderRecord.discount as number,
          discountType: orderRecord.discountType as DiscountType,
          total: orderRecord.total as number,
          createdAt: orderRecord.createdAt as number,
          paidAt: orderRecord.paidAt as number,
          ...(orderRecord.sentAt !== undefined ? { sentAt: orderRecord.sentAt as number } : {}),
        }),
        payments: freezePayments(payments),
        auditEntries: freezeAuditEntries(audits.filter((row): row is AuditEntry => Boolean(row))),
        lastReceipt: null,
      });
      return true;
    }
    const open = materializeOpenOrder(orderRecord);
    if (!open) return false;
    set({
      currentOrder: freezeOrder(open),
      payments: freezePayments(payments),
        auditEntries: freezeAuditEntries(audits.filter((row): row is AuditEntry => Boolean(row))),
      lastReceipt: null,
    });
    return true;
  },
  applyRestoredOpenOrder: (order, audits) => {
    const open = materializeOpenOrder(order);
    if (!open) return false;
    if (!Array.isArray(audits)) return false;
    const entries = audits.map((row) => {
      if (!isAuditRecord(row)) return null;
      return {
        id: row.id as string,
        tenantId: row.tenantId as string,
        staffId: row.staffId as string,
        action: row.action as string,
        entityType: row.entityType as string,
        entityId: row.entityId as string,
        details: { ...(row.details as Record<string, unknown>) },
        timestamp: row.timestamp as number,
      } as AuditEntry;
    });
    if (entries.some((row) => !row)) return false;
    set({
      currentOrder: freezeOrder(open),
      payments: freezePayments([]),
      auditEntries: freezeAuditEntries(entries.filter((row): row is AuditEntry => Boolean(row))),
      lastReceipt: null,
    });
    return true;
  },
  restoreOwnedPayState: (input) => {
    const raw = materializeRecord(input);
    if (!raw || !Array.isArray(raw.payments) || !Array.isArray(raw.audits)) return false;
    const order = raw.currentOrder === null || raw.currentOrder === undefined
      ? null
      : freezeOrder(structuredClone(raw.currentOrder) as Order);
    set({
      currentOrder: order,
      payments: freezePayments(structuredClone(raw.payments) as Payment[]),
      auditEntries: freezeAuditEntries(structuredClone(raw.audits) as AuditEntry[]),
      lastReceipt: raw.lastReceipt === null || raw.lastReceipt === undefined ? null : structuredClone(raw.lastReceipt) as PaymentReceipt,
    });
    return true;
  },
  recordPayment: (payment) => {
    try {
      const order = get().currentOrder;
      const validPayment = materializeRecord(payment);
      if (!order || (order.status !== "open" && order.status !== "sent") || !validPayment || !isPayment(validPayment)) return false;
      const staff = useTenantAuthStore.getState().staff;
      if (!staff || staff.tenantId !== order.tenantId || staff.id !== validPayment.staffId || !useTenantAuthStore.getState().can("payment.record")) return false;
      // Identity checks
      if (validPayment.tenantId !== order.tenantId || validPayment.orderId !== order.id || validPayment.staffId !== order.staffId) return false;
      if (validPayment.createdAt < order.createdAt) return false;
      if (order.sentAt !== undefined && validPayment.createdAt < order.sentAt) return false;
      // Idempotency: reject duplicate payment id
      if (get().payments.some(({ id }) => id === validPayment.id)) return false;
      const tender = validPayment.tender;
      if (!isMoney(tender) || validPayment.amount !== order.total) return false;
      if (validPayment.method === "cash" ? tender < order.total : tender !== order.total) return false;
      const change = validPayment.method === "cash" ? tender - order.total : 0;
      const receipt: PaymentReceipt = Object.freeze({
        paymentId: validPayment.id, orderId: validPayment.orderId, tenantId: validPayment.tenantId,
        staffId: validPayment.staffId, method: validPayment.method, paidTotal: order.total, change, timestamp: validPayment.createdAt,
      });
      const audit: AuditEntry = {
        id: `payment:${validPayment.id}`, tenantId: order.tenantId, staffId: order.staffId,
        action: "payment.recorded", entityType: "order", entityId: order.id,
        details: { paymentId: validPayment.id, method: validPayment.method, paidTotal: order.total, tender, change },
        timestamp: validPayment.createdAt,
      };
      set({
        currentOrder: freezeOrder({ ...order, status: "paid", paidAt: validPayment.createdAt }),
        payments: freezePayments([...get().payments, canonicalPayment(validPayment)]),
        auditEntries: freezeAuditEntries([...get().auditEntries, audit]),
        lastReceipt: receipt,
      });
      return true;
    } catch { return false; }
  },
}));

registerSessionClear(() => {
  useOrderPaymentStore.getState().clearSessionState();
});
