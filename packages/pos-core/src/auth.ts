import type { Role } from "./types";

type PinHashVerifier = (pin: string, pinHash: string) => boolean | Promise<boolean>;

const permissions: Record<Role, readonly string[]> = {
  manager: ["*"],
  cashier: ["order.*", "table.*", "shift.*", "payment.*"],
  staff: ["order.create", "order.add_item", "order.send", "table.open", "table.view"],
  kitchen: ["order.view_sent", "order.mark_done"],
};

const validAction = /^[a-z][a-z_]*\.[a-z][a-z_]*$/;

export async function verifyPin(pin: string, pinHash?: string, verifier?: PinHashVerifier): Promise<boolean> {
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin) || !pinHash || !verifier) return false;

  try {
    return await verifier(pin, pinHash);
  } catch {
    return false;
  }
}

export function canAccess(role: string, action: string): boolean {
  if (!validAction.test(action) || !Object.hasOwn(permissions, role)) return false;

  return permissions[role as Role].some((permission) => permission === "*" || permission === action || (permission.endsWith(".*") && action.startsWith(permission.slice(0, -1))));
}
