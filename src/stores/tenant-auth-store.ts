import { create } from "zustand";
import { canAccess, verifyPin } from "../../packages/pos-core/src/auth";
import type { PinHashVerifier } from "../../packages/pos-core/src/auth";
import type { Staff, Tenant } from "../../packages/pos-core/src/types";

export type { PinHashVerifier } from "../../packages/pos-core/src/auth";

type TenantAuthState = {
  tenant: Tenant | null;
  staff: Staff | null;
  setTenant: (tenant: Tenant | null) => void;
  signIn: (inputPin: string, candidate: Staff, verifier: PinHashVerifier) => Promise<boolean>;
  signOut: () => void;
  can: (action: string) => boolean;
};

export const useTenantAuthStore = create<TenantAuthState>((set, get) => ({
  tenant: null,
  staff: null,
  setTenant: (tenant) => set({ tenant }),
  signIn: async (inputPin, candidate, verifier) => {
    if (!(await verifyPin(inputPin, candidate.pinHash, verifier))) return false;
    set({ staff: candidate });
    return true;
  },
  signOut: () => set({ staff: null }),
  can: (action) => {
    const { staff } = get();
    return staff ? canAccess(staff.role, action) : false;
  },
}));
