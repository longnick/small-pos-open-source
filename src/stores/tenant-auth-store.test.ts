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

const otherTenant: Tenant = { ...tenant, id: "tenant-2", name: "Other POS" };

const cashier: Staff = {
  id: "staff-1",
  tenantId: tenant.id,
  name: "Cashier",
  role: "cashier",
  pinHash: "cashier-hash",
  createdAt: 1,
};

const manager: Staff = { ...cashier, id: "staff-2", name: "Manager", role: "manager", pinHash: "manager-hash" };
const otherCashier: Staff = { ...cashier, id: "staff-3", tenantId: otherTenant.id, name: "Other cashier" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

beforeEach(() => {
  useTenantAuthStore.setState({ tenant: null, staff: null, sessionToken: 0 });
});

test("sets and clears tenant", () => {
  useTenantAuthStore.getState().setTenant(tenant);
  expect(useTenantAuthStore.getState().tenant).toEqual(tenant);

  useTenantAuthStore.getState().setTenant(null);
  expect(useTenantAuthStore.getState().tenant).toBeNull();
});

test("tenant switch clears staff", () => {
  useTenantAuthStore.setState({ tenant, staff: cashier });

  useTenantAuthStore.getState().setTenant(otherTenant);
  expect(useTenantAuthStore.getState()).toMatchObject({ tenant: otherTenant, staff: null });

  useTenantAuthStore.setState({ staff: cashier });
  useTenantAuthStore.getState().setTenant(null);
  expect(useTenantAuthStore.getState()).toMatchObject({ tenant: null, staff: null });
});

test("signs in with asynchronous verifier", async () => {
  useTenantAuthStore.getState().setTenant(tenant);
  const verifier = vi.fn(async (pin: string, hash: string) => pin === "1234" && hash === cashier.pinHash);

  await expect(useTenantAuthStore.getState().signIn("1234", cashier, verifier)).resolves.toBe(true);
  expect(verifier).toHaveBeenCalledWith("1234", cashier.pinHash);
  expect(useTenantAuthStore.getState().staff).toEqual(cashier);
});

test("sign-in rejects cross-tenant staff without calling verifier", async () => {
  useTenantAuthStore.getState().setTenant(tenant);
  const verifier = vi.fn(async () => true);

  await expect(useTenantAuthStore.getState().signIn("1234", otherCashier, verifier)).resolves.toBe(false);
  expect(verifier).not.toHaveBeenCalled();
});

test("failed sign-in preserves current staff", async () => {
  useTenantAuthStore.setState({ tenant, staff: cashier });

  await expect(useTenantAuthStore.getState().signIn("0000", manager, async () => false)).resolves.toBe(false);
  await expect(useTenantAuthStore.getState().signIn("1234", manager, async () => { throw new Error("reject"); })).resolves.toBe(false);
  expect(useTenantAuthStore.getState().staff).toEqual(cashier);
});

test("pending sign-in cannot restore staff after sign-out", async () => {
  useTenantAuthStore.getState().setTenant(tenant);
  const pending = deferred<boolean>();
  const signIn = useTenantAuthStore.getState().signIn("1234", cashier, () => pending.promise);

  useTenantAuthStore.getState().signOut();
  pending.resolve(true);

  await expect(signIn).resolves.toBe(false);
  expect(useTenantAuthStore.getState().staff).toBeNull();
});

test("pending sign-in cannot restore staff after tenant switch", async () => {
  useTenantAuthStore.getState().setTenant(tenant);
  const pending = deferred<boolean>();
  const signIn = useTenantAuthStore.getState().signIn("1234", cashier, () => pending.promise);

  useTenantAuthStore.getState().setTenant(otherTenant);
  pending.resolve(true);

  await expect(signIn).resolves.toBe(false);
  expect(useTenantAuthStore.getState()).toMatchObject({ tenant: otherTenant, staff: null });
});

test("latest concurrent sign-in wins", async () => {
  useTenantAuthStore.getState().setTenant(tenant);
  const older = deferred<boolean>();
  const newer = deferred<boolean>();
  const olderSignIn = useTenantAuthStore.getState().signIn("1111", cashier, () => older.promise);
  const newerSignIn = useTenantAuthStore.getState().signIn("2222", manager, () => newer.promise);

  newer.resolve(true);
  await expect(newerSignIn).resolves.toBe(true);
  older.resolve(true);

  await expect(olderSignIn).resolves.toBe(false);
  expect(useTenantAuthStore.getState().staff).toEqual(manager);
});

test("session token changes on sign-in, sign-out, and same-staff re-login", async () => {
  useTenantAuthStore.getState().setTenant(tenant);
  const before = useTenantAuthStore.getState().sessionToken;
  expect(typeof before).toBe("number");

  await expect(useTenantAuthStore.getState().signIn("1234", cashier, async () => true)).resolves.toBe(true);
  const afterSignIn = useTenantAuthStore.getState().sessionToken;
  expect(afterSignIn).not.toBe(before);

  useTenantAuthStore.getState().signOut();
  const afterSignOut = useTenantAuthStore.getState().sessionToken;
  expect(afterSignOut).not.toBe(afterSignIn);

  await expect(useTenantAuthStore.getState().signIn("1234", cashier, async () => true)).resolves.toBe(true);
  expect(useTenantAuthStore.getState().sessionToken).not.toBe(afterSignOut);
  expect(useTenantAuthStore.getState().staff).toEqual(cashier);
});

test("can delegates core policy and fails closed without staff", () => {
  expect(useTenantAuthStore.getState().can("payment.refund")).toBe(false);

  useTenantAuthStore.setState({ staff: cashier });
  expect(useTenantAuthStore.getState().can("payment.refund")).toBe(true);
  expect(useTenantAuthStore.getState().can("catalog.edit")).toBe(false);
});
