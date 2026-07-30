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
