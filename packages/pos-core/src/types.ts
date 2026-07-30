export type Role = "manager" | "cashier" | "staff" | "kitchen";

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
