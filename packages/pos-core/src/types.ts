export type Role = "manager" | "cashier" | "staff" | "kitchen";

export type TableStatus = "empty" | "occupied" | "waiting_payment";

export interface PosTable {
  id: string;
  tenantId: string;
  /** 1–10 product constraint. */
  number: number;
  status: TableStatus;
  currentOrderId?: string;
  /** Epoch milliseconds. */
  openedAt: number;
  staffId: string;
}

export interface Tenant {
  id: string;
  name: string;
  address: string;
  phone: string;
  currency: "VND";
  /** Basis points. */
  defaultTax: number;
  /** VND. */
  defaultSurcharge: number;
  tableCount: number;
  /** Epoch milliseconds. */
  createdAt: number;
}

export interface Staff {
  id: string;
  tenantId: string;
  name: string;
  role: Role;
  /** Hashed PIN. */
  pinHash: string;
  /** Epoch milliseconds. */
  createdAt: number;
}

export type OrderStatus = "open" | "sent" | "paid" | "cancelled";

export interface OrderItem {
  id: string;
  orderId: string;
  catalogItemId: string;
  /** Catalog item name snapshot. */
  name: string;
  /** Catalog item price snapshot, integer VND. */
  price: number;
  quantity: number;
  note?: string;
  /** Epoch milliseconds. */
  cancelledAt?: number;
  cancelReason?: string;
}

export interface Order {
  id: string;
  tenantId: string;
  tableId: string;
  staffId: string;
  status: OrderStatus;
  items: OrderItem[];
  /** Computed integer VND. */
  subtotal: number;
  /** Integer VND. */
  discount: number;
  discountType: "amount" | "percent";
  discountPercent?: number;
  /** Computed integer VND. */
  total: number;
  /** Epoch milliseconds. */
  createdAt: number;
  /** Epoch milliseconds. */
  sentAt?: number;
  /** Epoch milliseconds. */
  paidAt?: number;
  /** Epoch milliseconds. */
  cancelledAt?: number;
}

export type PaymentMethod = "cash" | "transfer" | "card" | "other";

export interface Payment {
  id: string;
  tenantId: string;
  orderId: string;
  /** Amount recorded against the order, integer VND. */
  amount: number;
  /** Amount received from customer, integer VND. Required at payment-record boundary. */
  tender?: number;
  method: PaymentMethod;
  staffId: string;
  /** Epoch milliseconds. */
  createdAt: number;
  note?: string;
}

export interface Shift {
  id: string;
  tenantId: string;
  staffId: string;
  /** Epoch milliseconds. */
  openedAt: number;
  /** Epoch milliseconds. */
  closedAt?: number;
  /** Integer VND. */
  openingCash: number;
  /** Integer VND. */
  closingCash?: number;
  note?: string;
}

/**
 * Immutable local receipt produced after a successful in-memory payment.
 * Returned via store.lastReceipt and shown to the user before the dialog closes.
 */
export interface PaymentReceipt {
  paymentId: string;
  orderId: string;
  tenantId: string;
  staffId: string;
  method: PaymentMethod;
  /** Integer VND paid (= order total). */
  paidTotal: number;
  /** Integer VND change given back to customer (0 for non-cash). */
  change: number;
  /** Epoch milliseconds of the payment. */
  timestamp: number;
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  staffId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  /** Epoch milliseconds. */
  timestamp: number;
}

export type DomainEvent =
  | { type: "order.opened"; payload: { orderId: string; tableId: string } }
  | { type: "order.item_added"; payload: { orderId: string; itemId: string } }
  | { type: "order.item_removed"; payload: { orderId: string; itemId: string } }
  | { type: "order.sent"; payload: { orderId: string } }
  | { type: "order.paid"; payload: { orderId: string; paymentId: string } }
  | { type: "order.cancelled"; payload: { orderId: string; reason: string } }
  | { type: "table.opened"; payload: { tableId: string } }
  | { type: "table.transferred"; payload: { fromTableId: string; toTableId: string } }
  | { type: "shift.opened"; payload: { shiftId: string } }
  | { type: "shift.closed"; payload: { shiftId: string } }
  | { type: "catalog.item_updated"; payload: { itemId: string } };

export interface CatalogGroup {
  id: string;
  tenantId: string;
  name: string;
  sortOrder: number;
}

export interface CatalogItem {
  id: string;
  tenantId: string;
  groupId: string;
  name: string;
  /** Integer VND. */
  price: number;
  description?: string;
  imageUrl?: string;
  available: boolean;
  sortOrder: number;
  /** Epoch milliseconds. */
  createdAt: number;
  /** Epoch milliseconds. */
  updatedAt: number;
}
