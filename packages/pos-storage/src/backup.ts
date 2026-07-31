import type { PosDatabase } from "./db";

const BACKUP_STORES = [
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

type StoreName = (typeof BACKUP_STORES)[number];

type Backup = {
  version: 1;
  exportedAt: number;
  data: Record<StoreName, unknown[]>;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export async function exportBackup(database: PosDatabase): Promise<string> {
  const data = {} as Record<StoreName, unknown[]>;
  for (const store of BACKUP_STORES) data[store] = await database.table(store).toArray();
  return JSON.stringify({ version: 1, exportedAt: Date.now(), data });
}

export async function importBackup(database: PosDatabase, json: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid backup JSON");
  }

  if (!isPlainObject(parsed)) throw new Error("Invalid backup object");
  if (parsed.version !== 1) throw new Error("Unsupported backup version");
  if (typeof parsed.exportedAt !== "number" || !Number.isFinite(parsed.exportedAt)) {
    throw new Error("Invalid backup timestamp");
  }
  if (!isPlainObject(parsed.data)) throw new Error("Invalid backup data");

  const data = parsed.data;
  const keys = Object.keys(data);
  if (keys.length !== BACKUP_STORES.length || BACKUP_STORES.some((store) => !keys.includes(store))) {
    throw new Error("Backup store list does not match schema");
  }
  for (const store of BACKUP_STORES) {
    if (!Array.isArray(data[store])) throw new Error(`Backup store ${store} must be an array`);
  }

  const tables = BACKUP_STORES.map((store) => database.table(store));
  await database.transaction("rw", tables, async () => {
    for (const table of tables) await table.clear();
    for (const store of BACKUP_STORES) await database.table(store).bulkPut(data[store] as unknown[]);
  });
}
