import type { PosDatabase } from "./db";
import { isPlainObject, isProductViableBackupData } from "../../pos-core/src/product-records";

const V2_STORES = [
  "tenants",
  "staff",
  "catalogGroups",
  "catalogItems",
  "tables",
  "orders",
  "payments",
  "shifts",
  "auditLog",
  "appConfig",
] as const;

type V2StoreName = (typeof V2_STORES)[number];

export const UNSUPPORTED_FOR_PRODUCT_BOOTSTRAP = "unsupported-for-product-bootstrap";
export const BACKUP_NOT_PRODUCT_VIABLE = "backup-not-product-viable";

const hasExactStores = (data: Record<string, unknown>, stores: readonly string[]): boolean => {
  const keys = Object.keys(data);
  return keys.length === stores.length && stores.every((store) => keys.includes(store));
};

export function assertProductViableBackupJson(json: string): Record<V2StoreName, unknown[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid backup JSON");
  }
  if (!isPlainObject(parsed)) throw new Error("Invalid backup object");
  if (parsed.version === 1) throw new Error(UNSUPPORTED_FOR_PRODUCT_BOOTSTRAP);
  if (parsed.version !== 2) throw new Error("Unsupported backup version");
  if (typeof parsed.exportedAt !== "number" || !Number.isFinite(parsed.exportedAt)) {
    throw new Error("Invalid backup timestamp");
  }
  if (!isPlainObject(parsed.data)) throw new Error("Invalid backup data");
  const data = parsed.data;
  if (!hasExactStores(data, V2_STORES)) throw new Error("Backup store list does not match schema");
  for (const store of V2_STORES) {
    if (!Array.isArray(data[store])) throw new Error(`Backup store ${store} must be an array`);
  }
  if (!isProductViableBackupData({
    tenants: data.tenants as unknown[],
    staff: data.staff as unknown[],
    tables: data.tables as unknown[],
    appConfig: data.appConfig as unknown[],
    catalogGroups: data.catalogGroups as unknown[],
    catalogItems: data.catalogItems as unknown[],
    orders: data.orders as unknown[],
    payments: data.payments as unknown[],
    shifts: data.shifts as unknown[],
    auditLog: data.auditLog as unknown[],
  })) throw new Error(BACKUP_NOT_PRODUCT_VIABLE);
  return data as Record<V2StoreName, unknown[]>;
}

export async function exportBackup(database: PosDatabase): Promise<string> {
  const data = {} as Record<V2StoreName, unknown[]>;
  for (const store of V2_STORES) data[store] = await database.table(store).toArray();
  return JSON.stringify({ version: 2, exportedAt: Date.now(), data });
}

export async function importBackup(database: PosDatabase, json: string): Promise<void> {
  const data = assertProductViableBackupJson(json);
  const tables = V2_STORES.map((store) => database.table(store));
  await database.transaction("rw", tables, async () => {
    for (const table of tables) await table.clear();
    for (const store of V2_STORES) await database.table(store).bulkPut(data[store]);
  });
}

export type { V2StoreName };
