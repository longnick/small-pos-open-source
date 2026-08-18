import { create } from "zustand";
import { canAccess, verifyPin } from "../../packages/pos-core/src/auth";
import type { PinHashVerifier } from "../../packages/pos-core/src/auth";
import type { Staff, Tenant } from "../../packages/pos-core/src/types";
import { runSessionClear } from "./session-hooks";

export type { PinHashVerifier } from "../../packages/pos-core/src/auth";

type TenantAuthState = {
  tenant: Tenant | null;
  staff: Staff | null;
  sessionToken: number;
  setTenant: (tenant: Tenant | null) => void;
  signIn: (inputPin: string, candidate: Staff, verifier: PinHashVerifier) => Promise<boolean>;
  signOut: () => void;
  can: (action: string) => boolean;
};

let latestSignIn = 0;
let sessionGeneration = 0;

export const useTenantAuthStore = create<TenantAuthState>((set, get) => ({
  tenant: null,
  staff: null,
  sessionToken: 0,
  setTenant: (tenant) => {
    const changed = !tenant || get().tenant?.id !== tenant.id;
    if (changed) {
      latestSignIn += 1;
      sessionGeneration += 1;
      runSessionClear();
    }
    set(changed ? { tenant, staff: null, sessionToken: sessionGeneration } : { tenant });
  },
  signIn: async (inputPin, candidate, verifier) => {
    const attempt = ++latestSignIn;
    const generation = sessionGeneration;
    const tenantId = get().tenant?.id;
    if (!tenantId || !candidate || candidate.tenantId !== tenantId) return false;
    if (!(await verifyPin(inputPin, candidate.pinHash, verifier))) return false;
    if (attempt !== latestSignIn || generation !== sessionGeneration || get().tenant?.id !== tenantId) return false;
    sessionGeneration += 1;
    runSessionClear();
    set({ staff: candidate, sessionToken: sessionGeneration });
    return true;
  },
  signOut: () => {
    latestSignIn += 1;
    sessionGeneration += 1;
    runSessionClear();
    set({ staff: null, sessionToken: sessionGeneration });
  },
  can: (action) => {
    const { staff } = get();
    return staff ? canAccess(staff.role, action) : false;
  },
}));
