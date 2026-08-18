/**
 * E2E-only product bootstrap — substituted at build time via vite.e2e.config.ts.
 * Production App.tsx imports `@/pos/product-bootstrap`. This fixture returns a
 * ready tenant/staff pair without Dexie or demo-seed PINs.
 */
import type { Tenant, Staff } from "../../../packages/pos-core/src/types";
import type { PinHashVerifier } from "../../../packages/pos-core/src/auth";

const FIXTURE_TENANT: Tenant = {
  id: "tenant-e2e",
  name: "E2E Fixture Tenant",
  address: "1 Test Street",
  phone: "0000000000",
  currency: "VND",
  tableCount: 2,
  defaultTax: 0,
  defaultSurcharge: 0,
  createdAt: 0,
};

const FIXTURE_STAFF: Staff[] = [
  {
    id: "fixture-manager",
    tenantId: FIXTURE_TENANT.id,
    name: "Fixture Manager",
    role: "manager",
    pinHash: "fixture-placeholder",
    createdAt: 0,
  },
  {
    id: "fixture-cashier",
    tenantId: FIXTURE_TENANT.id,
    name: "Fixture Cashier",
    role: "cashier",
    pinHash: "fixture-placeholder",
    createdAt: 0,
  },
];

const fixtureVerifier: PinHashVerifier = async (pin: string): Promise<boolean> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 250));
  return pin === "2468";
};

export async function loadProductBootstrap() {
  return {
    kind: "ready" as const,
    tenant: FIXTURE_TENANT,
    staff: FIXTURE_STAFF,
    catalogGroups: [],
    catalogItems: [],
    tables: [],
    verifier: fixtureVerifier,
    persistable: false,
  };
}
