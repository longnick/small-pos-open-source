export type AppConfigRecord = {
  id: "product";
  tenantId: string;
  completedAt: number;
};

const ROLES = new Set(["manager", "cashier", "staff", "kitchen"]);
const TABLE_STATUSES = new Set(["empty", "occupied", "waiting_payment"]);
const SALT_BYTES = 16;
const KEY_BYTES = 32;

export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const isNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const isNonnegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0;

export const isTableNumber = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 10;

function base64Encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function decodeStrictBase64(value: string): Uint8Array | null {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;
  try {
    const bin = atob(value);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return base64Encode(arr.buffer) === value ? arr : null;
  } catch {
    return null;
  }
}

export function isValidPinHash(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = value.split("$");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const salt = decodeStrictBase64(parts[1]);
  const key = decodeStrictBase64(parts[2]);
  return Boolean(salt && key && salt.length === SALT_BYTES && key.length === KEY_BYTES);
}

export function isTenantRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false;
  return isNonemptyString(value.id)
    && isNonemptyString(value.name)
    && isNonemptyString(value.address)
    && isNonemptyString(value.phone)
    && value.currency === "VND"
    && isFiniteNumber(value.defaultTax)
    && isFiniteNumber(value.defaultSurcharge)
    && isTableNumber(value.tableCount)
    && isFiniteNumber(value.createdAt);
}

export function isStaffRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false;
  return isNonemptyString(value.id)
    && isNonemptyString(value.tenantId)
    && isNonemptyString(value.name)
    && typeof value.role === "string"
    && ROLES.has(value.role)
    && isValidPinHash(value.pinHash)
    && isFiniteNumber(value.createdAt);
}

export function isAppConfigRecord(value: unknown): value is AppConfigRecord {
  if (!isPlainObject(value)) return false;
  return value.id === "product" && isNonemptyString(value.tenantId) && isFiniteNumber(value.completedAt);
}

export function isPosTableRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false;
  return isNonemptyString(value.id)
    && isNonemptyString(value.tenantId)
    && isTableNumber(value.number)
    && typeof value.status === "string"
    && TABLE_STATUSES.has(value.status)
    && isNonemptyString(value.staffId)
    && isFiniteNumber(value.openedAt)
    && (value.currentOrderId === undefined || typeof value.currentOrderId === "string");
}

export function isCatalogGroupRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false;
  return isNonemptyString(value.id)
    && isNonemptyString(value.tenantId)
    && isNonemptyString(value.name)
    && isFiniteNumber(value.sortOrder);
}

export function isCatalogItemRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false;
  return isNonemptyString(value.id)
    && isNonemptyString(value.tenantId)
    && isNonemptyString(value.groupId)
    && isNonemptyString(value.name)
    && isNonnegativeInteger(value.price)
    && typeof value.available === "boolean"
    && isFiniteNumber(value.sortOrder)
    && isFiniteNumber(value.createdAt)
    && isFiniteNumber(value.updatedAt)
    && (value.description === undefined || typeof value.description === "string")
    && (value.imageUrl === undefined || typeof value.imageUrl === "string");
}

const uniqueIds = (rows: Array<{ id: unknown }>) =>
  new Set(rows.map((row) => row.id)).size === rows.length;

export function isProductViableShopData(data: {
  tenants: unknown[];
  staff: unknown[];
  tables: unknown[];
  appConfig: unknown[];
  catalogGroups: unknown[];
  catalogItems: unknown[];
}): boolean {
  if (data.tenants.length !== 1 || data.appConfig.length !== 1) return false;
  const tenant = data.tenants[0];
  const config = data.appConfig[0];
  if (!isTenantRecord(tenant) || !isAppConfigRecord(config)) return false;
  if (config.tenantId !== tenant.id) return false;
  if (!data.staff.every(isStaffRecord) || !uniqueIds(data.staff as Array<{ id: unknown }>)) return false;
  if (data.staff.some((row) => (row as { tenantId: string }).tenantId !== tenant.id)) return false;
  if (!data.staff.some((row) => (row as { role: string }).role === "manager")) return false;
  if (!data.tables.every(isPosTableRecord) || !uniqueIds(data.tables as Array<{ id: unknown }>)) return false;
  if (data.tables.length !== tenant.tableCount) return false;
  if (data.tables.some((row) => (row as { tenantId: string }).tenantId !== tenant.id)) return false;
  if (new Set(data.tables.map((row) => (row as { number: number }).number)).size !== data.tables.length) return false;
  if (!data.catalogGroups.every(isCatalogGroupRecord) || !uniqueIds(data.catalogGroups as Array<{ id: unknown }>)) return false;
  if (data.catalogGroups.some((row) => (row as { tenantId: string }).tenantId !== tenant.id)) return false;
  const groupIds = new Set(data.catalogGroups.map((row) => (row as { id: string }).id));
  if (!data.catalogItems.every(isCatalogItemRecord) || !uniqueIds(data.catalogItems as Array<{ id: unknown }>)) return false;
  if (data.catalogItems.some((row) => {
    const item = row as { tenantId: string; groupId: string };
    return item.tenantId !== tenant.id || !groupIds.has(item.groupId);
  })) return false;
  return true;
}
