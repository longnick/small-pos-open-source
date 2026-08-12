/**
 * Tests for demo-auth-adapter.ts
 * Slices 1–2: mapping, verifier correctness, fail-closed behaviour.
 *
 * All verifier tests use test-local PBKDF2 fixtures only.
 * No seed PINs or seed imports cross this file's boundary.
 */
import { describe, it, expect } from "vitest";
import type { Tenant, Staff } from "../../packages/pos-core/src/types";

// ---------------------------------------------------------------------------
// Test-local fixture helpers — mirror adapter internals exactly:
// v1, PBKDF2-SHA-256, 100_000 iterations, 16-byte salt, 256-bit key.
// ---------------------------------------------------------------------------

async function buildFixtureHash(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, hash: "SHA-256", iterations: 100_000 },
    keyMaterial,
    256,
  );
  const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `v1$${b64(salt.buffer)}$${b64(derived)}`;
}

// --- Slice 1: adapter maps core Tenant/Staff; no `pin` on output ---

describe("bootstrapDemoAuth – Slice 1: mapping", () => {
  it("is importable and returns a promise", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const result = bootstrapDemoAuth();
    expect(result).toBeInstanceOf(Promise);
  });

  it("resolves to { tenant, staff, verifier }", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { tenant, staff, verifier } = await bootstrapDemoAuth();
    expect(tenant).toBeDefined();
    expect(staff).toBeInstanceOf(Array);
    expect(typeof verifier).toBe("function");
  });

  it("tenant matches DEMO_TENANT shape: id, name, address, phone, currency, tableCount", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { tenant } = await bootstrapDemoAuth();
    const t = tenant as Tenant;
    expect(t.id).toBe("tenant-demo");
    expect(t.name).toBe("Quán Demo");
    expect(t.address).toBe("123 Đường ABC, Phường 1, TP.HCM");
    expect(t.phone).toBe("0901234567");
    expect(t.currency).toBe("VND");
    expect(t.tableCount).toBe(5);
    // Required core fields filled with zeros
    expect(typeof t.defaultTax).toBe("number");
    expect(typeof t.defaultSurcharge).toBe("number");
    expect(typeof t.createdAt).toBe("number");
  });

  it("staff array has 4 entries with ids: manager, cashier, staff-a, kitchen", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { staff } = await bootstrapDemoAuth();
    const arr = staff as Staff[];
    expect(arr).toHaveLength(4);
    const ids = arr.map((s) => s.id);
    expect(ids).toContain("manager");
    expect(ids).toContain("cashier");
    expect(ids).toContain("staff-a");
    expect(ids).toContain("kitchen");
  });

  it("each staff has tenantId === tenant.id", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { tenant, staff } = await bootstrapDemoAuth();
    for (const s of staff as Staff[]) {
      expect(s.tenantId).toBe((tenant as Tenant).id);
    }
  });

  it("no staff record has a `pin` property", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { staff } = await bootstrapDemoAuth();
    for (const s of staff as Staff[]) {
      expect(s).not.toHaveProperty("pin");
    }
  });

  it("each staff has a non-empty pinHash string", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { staff } = await bootstrapDemoAuth();
    for (const s of staff as Staff[]) {
      expect(typeof s.pinHash).toBe("string");
      expect(s.pinHash.length).toBeGreaterThan(0);
    }
  });

  it("pinHash is a versioned 3-part Base64 string, not raw digits", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { staff } = await bootstrapDemoAuth();
    // Format: "v1$<base64-salt>$<base64-key>" — no raw PIN knowledge required.
    const versionedHashPattern =
      /^v\d+\$(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\$(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    for (const s of staff as Staff[]) {
      expect(s.pinHash).toMatch(versionedHashPattern);
      // Must not be a bare 4-digit numeric string
      expect(s.pinHash).not.toMatch(/^\d{4}$/);
    }
  });

  it("each call produces different pinHash values (fresh salt)", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const r1 = await bootstrapDemoAuth();
    const r2 = await bootstrapDemoAuth();
    const hashes1 = (r1.staff as Staff[]).map((s) => s.pinHash);
    const hashes2 = (r2.staff as Staff[]).map((s) => s.pinHash);
    // At least one pair should differ (fresh random salt)
    const anyDifferent = hashes1.some((h, i) => h !== hashes2[i]);
    expect(anyDifferent).toBe(true);
  });
});

// --- Slice 2: verifier correctness ---

describe("bootstrapDemoAuth – Slice 2: verifier", () => {
  it("verifier accepts fixture PIN against fixture hash (adapter-isolated, no demo PINs)", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { verifier } = await bootstrapDemoAuth();

    // Fixture PIN unrelated to any demo seed value.
    const FIXTURE_PIN = "5678";
    const fixtureHash = await buildFixtureHash(FIXTURE_PIN);

    expect(await verifier(FIXTURE_PIN, fixtureHash)).toBe(true);
    // Different PIN against the same hash must be false
    expect(await verifier("9999", fixtureHash)).toBe(false);
  });

  it("verifier returns false for wrong PIN against a fresh fixture hash", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { staff, verifier } = await bootstrapDemoAuth();
    const arr = staff as Staff[];
    // "9999" is not any staff's PIN; must always be rejected
    for (const s of arr) {
      const result = await verifier("9999", s.pinHash);
      expect(result).toBe(false);
    }
  });

  it("verifier rejects a structurally valid fixture hash with a different fixture PIN", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { verifier } = await bootstrapDemoAuth();

    const FIXTURE_PIN = "5678";
    const fixtureHash = await buildFixtureHash(FIXTURE_PIN);

    // "7890" is a different fixture PIN — must be rejected against the hash
    expect(await verifier("7890", fixtureHash)).toBe(false);
  });

  it("verifier fails closed for empty string PIN", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { staff, verifier } = await bootstrapDemoAuth();
    const result = await verifier("", (staff as Staff[])[0].pinHash);
    expect(result).toBe(false);
  });

  it("verifier fails closed for non-4-digit PIN", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { staff, verifier } = await bootstrapDemoAuth();
    const hash = (staff as Staff[])[0].pinHash;
    expect(await verifier("000", hash)).toBe(false);
    expect(await verifier("55555", hash)).toBe(false);
    expect(await verifier("abcd", hash)).toBe(false);
  });

  it("verifier fails closed for malformed hash (wrong version prefix)", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { verifier } = await bootstrapDemoAuth();
    expect(await verifier("7890", "v99$somethingelse")).toBe(false);
  });

  it("verifier rejects non-canonical Base64 hash encoding", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { staff, verifier } = await bootstrapDemoAuth();
    const hash = (staff as Staff[])[0].pinHash;
    const [version, salt, key] = hash.split("$");
    expect(await verifier("7890", `${version}$ ${salt}$${key}`)).toBe(false);
  });

  it("verifier fails closed for empty hash", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { verifier } = await bootstrapDemoAuth();
    expect(await verifier("7890", "")).toBe(false);
  });

  it("verifier fails closed for tampered hash (mutated derived-key byte)", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { verifier } = await bootstrapDemoAuth();

    // Build a structurally valid fixture hash using a test-local PIN.
    // Mirrors adapter internals: v1, PBKDF2-SHA-256, 100_000 iter,
    // 16-byte salt, 256-bit (32-byte) key.
    const FIXTURE_PIN = "5678";
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(FIXTURE_PIN),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derived = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, hash: "SHA-256", iterations: 100_000 },
      keyMaterial,
      256,
    );
    const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
    const saltB64 = b64(salt.buffer);
    const keyB64 = b64(derived);

    // Sanity: verifier must accept the correct PIN/hash before tampering
    const goodHash = `v1$${saltB64}$${keyB64}`;
    expect(await verifier(FIXTURE_PIN, goodHash)).toBe(true);

    // Mutate one byte in the middle of the decoded derived key
    const keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
    expect(keyBytes.length).toBe(32); // guard: full 32-byte key
    keyBytes[16] ^= 0xff;

    // Re-encode to canonical Base64 — same length, valid padding, different bytes
    const mutatedKeyB64 = btoa(String.fromCharCode(...keyBytes));
    expect(mutatedKeyB64.length).toBe(keyB64.length); // structure preserved
    expect(mutatedKeyB64).not.toBe(keyB64);           // byte content changed

    // Reconstruct: valid version + original salt + mutated key
    const tamperedHash = `v1$${saltB64}$${mutatedKeyB64}`;

    // Verifier must return false — timing-safe compare detects the key mismatch
    expect(await verifier(FIXTURE_PIN, tamperedHash)).toBe(false);
  });

  it("verifier fails closed for non-string inputs", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { verifier } = await bootstrapDemoAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await verifier(null as any, "v1$abc")).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await verifier("7890", null as any)).toBe(false);
  });
});

// --- Slice L: verifier fails closed when WebCrypto rejects ---

describe("bootstrapDemoAuth – Slice L: fail-closed on WebCrypto rejection", () => {
  it("verifier returns false when crypto.subtle.importKey rejects", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { verifier } = await bootstrapDemoAuth();

    // Build a structurally valid fixture hash so the verifier would succeed
    // under normal conditions — isolating the mock as the sole failure cause.
    const FIXTURE_PIN = "3142";
    const fixtureHash = await buildFixtureHash(FIXTURE_PIN);

    // Save the real importKey and replace it with a rejecting stub.
    const realImportKey = crypto.subtle.importKey.bind(crypto.subtle);
    try {
      crypto.subtle.importKey = () =>
        Promise.reject(new DOMException("mocked importKey failure", "OperationError"));

      // With importKey rejecting, the verifier must catch the error and return false.
      const result = await verifier(FIXTURE_PIN, fixtureHash);
      expect(result).toBe(false);
    } finally {
      // Always restore — even if the assertion above throws.
      crypto.subtle.importKey = realImportKey;

      // Confirm the real API works again: the fixture hash should now pass.
      expect(await verifier(FIXTURE_PIN, fixtureHash)).toBe(true);
    }
  });

  it("verifier returns false when crypto.subtle.deriveBits rejects", async () => {
    const { bootstrapDemoAuth } = await import("./demo-auth-adapter");
    const { verifier } = await bootstrapDemoAuth();

    // Build a structurally valid fixture hash so the verifier would succeed
    // under normal conditions — isolating the mock as the sole failure cause.
    const FIXTURE_PIN = "2718";
    const fixtureHash = await buildFixtureHash(FIXTURE_PIN);

    // Save the real deriveBits and replace it with a rejecting stub.
    // importKey must succeed so execution reaches deriveBits.
    const realDeriveBits = crypto.subtle.deriveBits.bind(crypto.subtle);
    try {
      crypto.subtle.deriveBits = () =>
        Promise.reject(new DOMException("mocked deriveBits failure", "OperationError"));

      // With deriveBits rejecting, the verifier must catch the error and return false.
      const result = await verifier(FIXTURE_PIN, fixtureHash);
      expect(result).toBe(false);
    } finally {
      // Always restore — even if the assertion above throws.
      crypto.subtle.deriveBits = realDeriveBits;

      // Confirm the real API works again: the fixture hash should now pass.
      expect(await verifier(FIXTURE_PIN, fixtureHash)).toBe(true);
    }
  });
});
