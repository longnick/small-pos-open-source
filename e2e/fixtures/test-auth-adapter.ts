/**
 * E2E-only auth adapter — substituted at build time via vite.e2e.config.ts alias.
 * Must NOT be imported by any production source; it never enters dist/.
 *
 * Exports the identical `bootstrapDemoAuth` shape as the production adapter so
 * App.tsx can import @/auth/demo-auth-adapter without any source change.
 *
 * Constraints:
 * - No import of demo-seed, DEMO_STAFF, DEMO_TENANT, or raw production PINs.
 * - No runtime selector (URL/storage/window/global flag).
 * - Native in-memory verifier: accepts only generic PIN "2468", rejects all else.
 * - Fixed 250 ms delay makes the busy state deterministic in Slice B tests.
 */

import type { Tenant, Staff } from "../../../packages/pos-core/src/types";
import type { PinHashVerifier } from "../../../packages/pos-core/src/auth";

// ---------------------------------------------------------------------------
// Fake tenant — distinct from production seed; no collision with DEMO_TENANT.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Fake staff — distinct from production seed; name proves substitution.
// ---------------------------------------------------------------------------
// PIN hashes are opaque strings produced by the fixture verifier below; they
// carry no semantic value — the verifier ignores them entirely and only checks
// the submitted PIN against the accepted generic value.
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

// ---------------------------------------------------------------------------
// In-memory verifier: accepts only "2468", rejects all other values.
// Fixed 250 ms delay makes the busy state deterministic.
// Does not use PBKDF2 or pinHash — hash is irrelevant in the fixture.
// ---------------------------------------------------------------------------
const fixtureVerifier: PinHashVerifier = async (
  pin: string,
  _pinHash: string,
): Promise<boolean> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 250));
  return pin === "2468";
};

// ---------------------------------------------------------------------------
// Exported shape identical to production bootstrapDemoAuth — App.tsx calls
// this transparently.
// ---------------------------------------------------------------------------
export type DemoAuthBootstrap = {
  tenant: Tenant;
  staff: Staff[];
  verifier: PinHashVerifier;
};

export async function bootstrapDemoAuth(): Promise<DemoAuthBootstrap> {
  return {
    tenant: FIXTURE_TENANT,
    staff: FIXTURE_STAFF,
    verifier: fixtureVerifier,
  };
}
