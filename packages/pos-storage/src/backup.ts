import type { PosDatabase } from "./db";

const V1_STORES = [
  "tenants",
  "staff",
  "catalogGroups",
  "catalogItems",
  "tables",
  "orders",
  "payments",
  "shifts",
  "auditLog",
] as const;

const V2_STORES = [...V1_STORES, "appConfig"] as const;

type V1StoreName = (typeof V1_STORES)[number];
type V2StoreName = (typeof V2_STORES)[number];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasExactStores = (data: Record<string, unknown>, stores: readonly string[]): boolean => {
  const keys = Object.keys(data);
  return keys.length === stores.length && stores.every((store) => keys.includes(store));
};

export async function exportBackup(database: PosDatabase): Promise<string> {
  const data = {} as Record<V2StoreName, unknown[]>;
  for (const store of V2_STORES) data[store] = await database.table(store).toArray();
  return JSON.stringify({ version: 2, exportedAt: Date.now(), data });
}

export async function importBackup(database: PosDatabase, json: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid backup JSON");
  }

  if (!isPlainObject(parsed)) throw new Error("Invalid backup object");
  if (parsed.version !== 1 && parsed.version !== 2) throw new Error("Unsupported backup version");
  if (typeof parsed.exportedAt !== "number" || !Number.isFinite(parsed.exportedAt)) {
    throw new Error("Invalid backup timestamp");
  }
  if (!isPlainObject(parsed.data)) throw new Error("Invalid backup data");

  const data = parsed.data;
  const stores = parsed.version === 1 ? V1_STORES : V2_STORES;
  if (!hasExactStores(data, stores)) throw new Error("Backup store list does not match schema");
  for (const store of stores) {
    if (!Array.isArray(data[store])) throw new Error(`Backup store ${store} must be an array`);
  }

  const tables = V2_STORES.map((store) => database.table(store));
  await database.transaction("rw", tables, async () => {
    for (const table of tables) await table.clear();
    for (const store of stores) await database.table(store).bulkPut(data[store] as unknown[]);
  });
}

export type { V1StoreName, V2StoreName };
