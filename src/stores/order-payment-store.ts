import { create } from "zustand";
import { computeDiscount, computeSubtotal, computeTotal } from "../../packages/pos-core/src/order-calc";
import type { Order, OrderItem, Payment } from "../../packages/pos-core/src/types";

type DiscountType = Order["discountType"];
type OrderPaymentState = {
  currentOrder: Order | null;
  payments: Payment[];
  createOpenOrder: (order: unknown) => boolean;
  selectOpenOrder: (order: unknown) => boolean;
  clearCurrentOrder: () => void;
  addItem: (item: unknown) => boolean;
  updateItemQuantity: (id: unknown, quantity: unknown) => boolean;
  removeItem: (id: unknown) => boolean;
  setDiscount: (type: unknown, value: unknown) => boolean;
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
  && isMoney(value.amount) && (value.method === "cash" || value.method === "transfer" || value.method === "card" || value.method === "other")
  && isNonemptyString(value.staffId) && isSafeInteger(value.createdAt) && (value.note === undefined || typeof value.note === "string");
const canonicalItem = (item: OrderItem): OrderItem => ({
  id: item.id, orderId: item.orderId, catalogItemId: item.catalogItemId, name: item.name, price: item.price, quantity: item.quantity,
  ...(item.note !== undefined ? { note: item.note } : {}),
  ...(item.cancelledAt !== undefined ? { cancelledAt: item.cancelledAt } : {}),
  ...(item.cancelReason !== undefined ? { cancelReason: item.cancelReason } : {}),
});
const canonicalPayment = (payment: Payment): Payment => ({
  id: payment.id, tenantId: payment.tenantId, orderId: payment.orderId, amount: payment.amount, method: payment.method, staffId: payment.staffId, createdAt: payment.createdAt,
  ...(payment.note !== undefined ? { note: payment.note } : {}),
});

const materializeOpenOrder = (value: unknown): Order | null => {
  const order = materializeRecord(value);
  if (!order || !isNonemptyString(order.id) || !isNonemptyString(order.tenantId) || !isNonemptyString(order.tableId) || !isNonemptyString(order.staffId)
    || order.status !== "open" || Object.hasOwn(order, "sentAt") || Object.hasOwn(order, "paidAt") || Object.hasOwn(order, "cancelledAt")
    || !Array.isArray(order.items) || !isMoney(order.subtotal) || !isMoney(order.discount) || !isDiscountType(order.discountType) || !isMoney(order.total)
    || !isSafeInteger(order.createdAt) || (order.discountPercent !== undefined && !isMoney(order.discountPercent))
    || (order.discountType === "amount" && order.discountPercent !== undefined)) return null;
  const items = order.items.map(materializeRecord);
  if (items.some((item) => !item || !isOrderItem(item))) return null;
  const validOrder = {
    id: order.id, tenantId: order.tenantId, tableId: order.tableId, staffId: order.staffId, status: order.status,
    items: (items as (Record<string, unknown> & OrderItem)[]).map(canonicalItem), subtotal: order.subtotal, discount: order.discount,
    discountType: order.discountType, total: order.total, createdAt: order.createdAt,
    ...(order.discountPercent !== undefined ? { discountPercent: order.discountPercent } : {}),
    ...(order.sentAt !== undefined ? { sentAt: order.sentAt } : {}),
    ...(order.paidAt !== undefined ? { paidAt: order.paidAt } : {}),
    ...(order.cancelledAt !== undefined ? { cancelledAt: order.cancelledAt } : {}),
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
  createOpenOrder: (order) => !get().currentOrder && get().selectOpenOrder(order),
  selectOpenOrder: (order) => {
    try {
      const validOrder = materializeOpenOrder(order);
      if (!validOrder) return false;
      set({ currentOrder: freezeOrder(validOrder) });
      return true;
    } catch { return false; }
  },
  clearCurrentOrder: () => set({ currentOrder: null }),
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
  recordPayment: (payment) => {
    try {
      const order = get().currentOrder;
      const validPayment = materializeRecord(payment);
      if (!order || order.status !== "open" || !validPayment || !isPayment(validPayment) || validPayment.tenantId !== order.tenantId || validPayment.orderId !== order.id || validPayment.staffId !== order.staffId || validPayment.amount < order.total || get().payments.some(({ id }) => id === validPayment.id)) return false;
      set({ currentOrder: freezeOrder({ ...order, status: "paid", paidAt: validPayment.createdAt }), payments: freezePayments([...get().payments, canonicalPayment(validPayment)]) });
      return true;
    } catch { return false; }
  },
}));
