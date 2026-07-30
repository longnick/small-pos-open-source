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
  /** Integer VND. */
  amount: number;
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
