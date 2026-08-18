import type { PosDatabase } from "../../packages/pos-storage/src/db";
import type { CatalogGroup, CatalogItem, PosTable, Staff, Tenant } from "../../packages/pos-core/src/types";
import { isProductViableShopData, isValidPinHash, decodeStrictBase64 } from "../../packages/pos-core/src/product-records";

export type ProductSetupState =
  | { kind: "needs-setup" }
  | { kind: "ready"; tenantId: string }
  | { kind: "corrupt" };

export type FirstRunInput = {
  shopName: string;
  tableCount: number;
  managerName: string;
  pin: string;
  seedSampleMenu: boolean;
};

export type FirstRunResult = { ok: true; tenantId: string } | { ok: false };

const PIN_VERSION = "v1";
const PIN_ITERATIONS = 100_000;
const PIN_KEY_BITS = 256;
const PIN_SALT_BYTES = 16;

const isPrimitiveNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isTableCount = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 10;

function base64Encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function sampleCatalog(tenantId: string, now: number): { groups: CatalogGroup[]; items: CatalogItem[] } {
  const groups: CatalogGroup[] = [
    { id: "sample-drinks", tenantId, name: "Nước uống", sortOrder: 0 },
    { id: "sample-food", tenantId, name: "Đồ ăn", sortOrder: 1 },
  ];
  const items: CatalogItem[] = [
    { id: "sample-coffee", tenantId, groupId: "sample-drinks", name: "Cà phê đen", price: 25_000, available: true, sortOrder: 0, createdAt: now, updatedAt: now },
    { id: "sample-tea", tenantId, groupId: "sample-drinks", name: "Trà đá", price: 15_000, available: true, sortOrder: 1, createdAt: now, updatedAt: now },
    { id: "sample-rice", tenantId, groupId: "sample-food", name: "Cơm rang", price: 45_000, available: true, sortOrder: 0, createdAt: now, updatedAt: now },
  ];
  return { groups, items };
}

async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const salt = crypto.getRandomValues(new Uint8Array(PIN_SALT_BYTES));
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, hash: "SHA-256", iterations: PIN_ITERATIONS },
    keyMaterial,
    PIN_KEY_BITS,
  );
  return `${PIN_VERSION}$${base64Encode(salt.buffer)}$${base64Encode(derived)}`;
}

export async function verifyStoredPin(pin: string, pinHash: string): Promise<boolean> {
  try {
    if (typeof pin !== "string" || !/^\d{4}$/.test(pin) || !isValidPinHash(pinHash)) return false;
    const parts = pinHash.split("$");
    const salt = decodeStrictBase64(parts[1]);
    const storedKey = decodeStrictBase64(parts[2]);
    if (!salt || !storedKey) return false;
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
    const derived = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, hash: "SHA-256", iterations: PIN_ITERATIONS },
      keyMaterial,
      PIN_KEY_BITS,
    );
    return timingSafeEqual(new Uint8Array(derived), storedKey);
  } catch {
    return false;
  }
}

export async function readProductSetupState(database: PosDatabase): Promise<ProductSetupState> {
  try {
    const [tenants, staff, tables, config] = await Promise.all([
      database.tenants.toArray(),
      database.staff.toArray(),
      database.posTables.toArray(),
      database.appConfig.get("product"),
    ]);
    if (tenants.length === 0 && staff.length === 0 && tables.length === 0 && !config) return { kind: "needs-setup" };
    const groups = await database.catalogGroups.toArray();
    const items = await database.catalogItems.toArray();
    if (!isProductViableShopData({
      tenants,
      staff,
      tables,
      appConfig: config ? [config] : [],
      catalogGroups: groups,
      catalogItems: items,
    })) return { kind: "corrupt" };
    return { kind: "ready", tenantId: tenants[0].id };
  } catch {
    return { kind: "corrupt" };
  }
}

export async function completeFirstRun(database: PosDatabase, input: FirstRunInput): Promise<FirstRunResult> {
  try {
    if (!input || !isPrimitiveNonemptyString(input.shopName) || !isPrimitiveNonemptyString(input.managerName)) {
      return { ok: false };
    }
    if (!isTableCount(input.tableCount) || typeof input.pin !== "string" || !/^\d{4}$/.test(input.pin)) {
      return { ok: false };
    }
    const current = await readProductSetupState(database);
    if (current.kind !== "needs-setup") return { ok: false };

    const pinHash = await hashPin(input.pin);
    const now = Date.now();
    const tenantId = `tenant-${crypto.randomUUID()}`;
    const staffId = `staff-${crypto.randomUUID()}`;
    const tenant: Tenant = {
      id: tenantId,
      name: input.shopName.trim(),
      address: "Chưa cập nhật",
      phone: "0000000000",
      currency: "VND",
      defaultTax: 0,
      defaultSurcharge: 0,
      tableCount: input.tableCount,
      createdAt: now,
    };
    const manager: Staff = {
      id: staffId,
      tenantId,
      name: input.managerName.trim(),
      role: "manager",
      pinHash,
      createdAt: now,
    };
    const tables: PosTable[] = Array.from({ length: input.tableCount }, (_, index) => ({
      id: `table-${index + 1}`,
      tenantId,
      number: index + 1,
      status: "empty",
      openedAt: 0,
      staffId,
    }));
    const catalog = input.seedSampleMenu ? sampleCatalog(tenantId, now) : { groups: [], items: [] };
    const config = { id: "product" as const, tenantId, completedAt: now };

    await database.transaction(
      "rw",
      [database.tenants, database.staff, database.posTables, database.catalogGroups, database.catalogItems, database.appConfig],
      async () => {
        const again = await readProductSetupState(database);
        if (again.kind !== "needs-setup") throw new Error("setup-exists");
        await database.tenants.add(tenant);
        await database.staff.add(manager);
        await database.appConfig.add(config);
        for (const table of tables) await database.posTables.add(table);
        for (const group of catalog.groups) await database.catalogGroups.add(group);
        for (const item of catalog.items) await database.catalogItems.add(item);
      },
    );
    return { ok: true, tenantId };
  } catch {
    return { ok: false };
  }
}
