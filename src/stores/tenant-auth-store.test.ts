import { beforeEach, expect, test, vi } from "vitest";
import type { Staff, Tenant } from "../../packages/pos-core/src/types";
import { useTenantAuthStore } from "./tenant-auth-store";

const tenant: Tenant = {
  id: "tenant-1",
  name: "Small POS",
  address: "1 Main St",
  phone: "0123456789",
  currency: "VND",
  defaultTax: 0,
  defaultSurcharge: 0,
  tableCount: 1,
  createdAt: 1,
};

const cashier: Staff = {
  id: "staff-1",
  tenantId: tenant.id,
  name: "Cashier",
  role: "cashier",
  pinHash: "cashier-hash",
  createdAt: 1,
};

const manager: Staff = { ...cashier, id: "staff-2", name: "Manager", role: "manager", pinHash: "manager-hash" };

beforeEach(() => {
  useTenantAuthStore.setState({ tenant: null, staff: null });
});

test("sets and clears tenant", () => {
  useTenantAuthStore.getState().setTenant(tenant);
  expect(useTenantAuthStore.getState().tenant).toEqual(tenant);

  useTenantAuthStore.getState().setTenant(null);
  expect(useTenantAuthStore.getState().tenant).toBeNull();
});

test("signs in with asynchronous verifier", async () => {
  const verifier = vi.fn(async (pin: string, hash: string) => pin === "1234" && hash === cashier.pinHash);

  await expect(useTenantAuthStore.getState().signIn("1234", cashier, verifier)).resolves.toBe(true);
  expect(verifier).toHaveBeenCalledWith("1234", cashier.pinHash);
  expect(useTenantAuthStore.getState().staff).toEqual(cashier);
});

test("failed sign-in preserves current staff", async () => {
  useTenantAuthStore.setState({ staff: cashier });

  await expect(useTenantAuthStore.getState().signIn("0000", manager, async () => false)).resolves.toBe(false);
  await expect(useTenantAuthStore.getState().signIn("1234", manager, async () => { throw new Error("reject"); })).resolves.toBe(false);
  expect(useTenantAuthStore.getState().staff).toEqual(cashier);
});

test("sign-out preserves tenant", () => {
  useTenantAuthStore.setState({ tenant, staff: cashier });

  useTenantAuthStore.getState().signOut();
  expect(useTenantAuthStore.getState()).toMatchObject({ tenant, staff: null });
});

test("can delegates core policy and fails closed without staff", () => {
  expect(useTenantAuthStore.getState().can("payment.refund")).toBe(false);

  useTenantAuthStore.setState({ staff: cashier });
  expect(useTenantAuthStore.getState().can("payment.refund")).toBe(true);
  expect(useTenantAuthStore.getState().can("catalog.edit")).toBe(false);
});
