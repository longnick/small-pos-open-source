import { expect, test } from "vitest";
import type { Role, Staff, Tenant } from "../src/types";

const roles = ["manager", "cashier", "staff", "kitchen"] as const satisfies readonly Role[];

const tenant: Tenant = {
  id: "tenant-demo",
  name: "Demo Cafe",
  address: "123 Demo Street",
  phone: "0900000000",
  currency: "VND",
  defaultTax: 1000,
  defaultSurcharge: 5000,
  tableCount: 4,
  createdAt: 0,
};

const staff: Staff = {
  id: "staff-demo",
  tenantId: "tenant-demo",
  name: "Demo Cashier",
  role: "cashier",
  pinHash: "demo-pin-hash",
  createdAt: 0,
};

test("Role contract contains exactly four unique values", () => {
  expect(roles).toHaveLength(4);
  expect(new Set(roles).size).toBe(4);
  expect(roles).toEqual(["manager", "cashier", "staff", "kitchen"]);
});
