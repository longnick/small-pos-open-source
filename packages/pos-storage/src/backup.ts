import type { PosDatabase } from "./db";

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

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isTableCount = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 10;

const hasExactStores = (data: Record<string, unknown>, stores: readonly string[]): boolean => {
  const keys = Object.keys(data);
  return keys.length === stores.length && stores.every((store) => keys.includes(store));
};

const pinHashPattern =
  /^v1\$(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\$(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function isProductViableBackupData(data: Record<string, unknown>): boolean {
  const tenants = data.tenants;
  const staff = data.staff;
  const tables = data.tables;
  const configRows = data.appConfig;
  const groups = data.catalogGroups;
  const items = data.catalogItems;
  if (!Array.isArray(tenants) || !Array.isArray(staff) || !Array.isArray(tables) || !Array.isArray(configRows)) return false;
  if (!Array.isArray(groups) || !Array.isArray(items)) return false;
  if (tenants.length !== 1 || configRows.length !== 1) return false;
  const tenant = tenants[0];
  const config = configRows[0];
  if (!isPlainObject(tenant) || !isPlainObject(config)) return false;
  if (!isNonemptyString(tenant.id) || !isNonemptyString(tenant.name)) return false;
  if (!isNonemptyString(tenant.address) || !isNonemptyString(tenant.phone) || tenant.currency !== "VND") return false;
  if (!isTableCount(tenant.tableCount)) return false;
  if (config.id !== "product" || config.tenantId !== tenant.id || !Number.isFinite(config.completedAt)) return false;
  const managers = staff.filter((row) => isPlainObject(row) && row.tenantId === tenant.id && row.role === "manager");
  if (managers.length < 1) return false;
  if (managers.some((row) => !isPlainObject(row) || !pinHashPattern.test(String(row.pinHash ?? "")))) return false;
  if (staff.some((row) => !isPlainObject(row) || row.tenantId !== tenant.id)) return false;
  if (tables.length !== tenant.tableCount) return false;
  const numbers = tables.map((row) => (isPlainObject(row) ? row.number : null));
  if (new Set(numbers).size !== tables.length) return false;
  if (tables.some((row) => !isPlainObject(row) || row.tenantId !== tenant.id || !isTableCount(row.number))) return false;
  if (groups.some((row) => !isPlainObject(row) || row.tenantId !== tenant.id)) return false;
  if (items.some((row) => {
    if (!isPlainObject(row) || row.tenantId !== tenant.id) return true;
    if (!Number.isSafeInteger(row.price) || (row.price as number) < 0) return true;
    return !groups.some((group) => isPlainObject(group) && group.id === row.groupId);
  })) return false;
  return true;
}

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
  if (!isProductViableBackupData(data)) throw new Error(BACKUP_NOT_PRODUCT_VIABLE);
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
