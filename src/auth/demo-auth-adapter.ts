/**
 * ponytail: ephemeral demo verifier only; replace with approved bcrypt/cloud
 * adapter at persistence/auth integration.
 *
 * Maps DEMO_TENANT / DEMO_STAFF to core Tenant/Staff via WebCrypto PBKDF2
 * SHA-256. Fresh 16-byte random salt per staff per bootstrap call. Hash
 * encoded as versioned string "v1$<salt_b64>$<key_b64>". Verifier fails
 * closed for any malformed input, bad version, wrong length, or crypto error.
 * Raw PIN never escapes this module; no logging, storage, window globals.
 */
import { DEMO_TENANT, DEMO_STAFF } from "../data/demo-seed";
import type { Tenant, Staff } from "../../packages/pos-core/src/types";
import type { PinHashVerifier } from "../../packages/pos-core/src/auth";

const VERSION = "v1";
const ITERATIONS = 100_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;
const KEY_BYTES = KEY_BITS / 8; // 32

function base64Encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64Decode(s: string): Uint8Array | null {
  // Reject permissive atob forms such as whitespace or omitted padding.
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s)) return null;
  try {
    const bin = atob(s);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return base64Encode(arr.buffer) === s ? arr : null;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, hash: "SHA-256", iterations: ITERATIONS },
    keyMaterial,
    KEY_BITS,
  );
  return `${VERSION}$${base64Encode(salt.buffer)}$${base64Encode(derived)}`;
}

/**
 * PinHashVerifier — injected into useTenantAuthStore.signIn.
 * Fails closed (returns false) for any invalid input or crypto error.
 */
const demoVerifier: PinHashVerifier = async (pin: string, pinHash: string): Promise<boolean> => {
  try {
    if (typeof pin !== "string" || typeof pinHash !== "string") return false;
    if (!/^\d{4}$/.test(pin)) return false;

    const parts = pinHash.split("$");
    if (parts.length !== 3 || parts[0] !== VERSION) return false;

    const salt = base64Decode(parts[1]);
    const storedKey = base64Decode(parts[2]);
    if (!salt || !storedKey) return false;
    if (salt.length !== SALT_BYTES || storedKey.length !== KEY_BYTES) return false;

    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(pin),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const derived = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, hash: "SHA-256", iterations: ITERATIONS },
      keyMaterial,
      KEY_BITS,
    );
    return timingSafeEqual(new Uint8Array(derived), storedKey);
  } catch {
    return false;
  }
};

export type DemoAuthBootstrap = {
  tenant: Tenant;
  staff: Staff[];
  verifier: PinHashVerifier;
};

/**
 * Bootstrap demo auth: hash each staff PIN with a fresh random salt,
 * return core Tenant/Staff records (no `pin` field) and the shared verifier.
 * Called once at app startup; raw PINs are only referenced inside this call,
 * never stored or returned.
 */
export async function bootstrapDemoAuth(): Promise<DemoAuthBootstrap> {
  const tenant: Tenant = {
    id: DEMO_TENANT.id,
    name: DEMO_TENANT.name,
    address: DEMO_TENANT.address,
    phone: DEMO_TENANT.phone,
    currency: DEMO_TENANT.currency,
    tableCount: DEMO_TENANT.tableCount,
    defaultTax: 0,
    defaultSurcharge: 0,
    createdAt: 0,
  };

  const staff: Staff[] = await Promise.all(
    DEMO_STAFF.map(async (ds) => {
      const pinHash = await hashPin(ds.pin);
      // Raw PIN used only here to produce the hash; never stored or returned.
      return {
        id: ds.id,
        tenantId: tenant.id,
        name: ds.name,
        role: ds.role,
        pinHash,
        createdAt: 0,
      };
    }),
  );

  return { tenant, staff, verifier: demoVerifier };
}
