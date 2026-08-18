import { create } from "zustand";
import type { CatalogGroup, CatalogItem, PosTable } from "../../packages/pos-core/src/types";

type TenantData = {
  catalogGroups: CatalogGroup[];
  catalogItems: CatalogItem[];
  tables: PosTable[];
};

type CatalogTableState = TenantData & {
  tenantId: string | null;
  replaceTenantData: (tenantId: string, data: TenantData) => boolean;
  clear: () => void;
  itemsForGroup: (groupId: string) => CatalogItem[];
  tableById: (id: string) => PosTable | null;
  /**
   * Mark an empty table as occupied for the given order.
   *
   * Accepts only when:
   *   - `tableId`, `orderId`, and `tenantId` are all non-empty strings;
   *   - `tenantId` matches the store's loaded tenant;
   *   - a table with `tableId` exists and belongs to `tenantId`;
   *   - that table's `status` is `"empty"`.
   *
   * Returns `true` and sets `{status:'occupied', currentOrderId}` on success.
   * Returns `false` with **no state change** on any mismatch.
   */
  occupyTable: (tableId: string, orderId: string, tenantId: string) => boolean;
  restoreOccupiedTable: (tableId: string, orderId: string, tenantId: string) => boolean;
  /**
   * Release a table back to `empty` after a matching paid order.
   *
   * Accepts only when:
   *   - `tableId` identifies an existing table in the store;
   *   - that table's `currentOrderId` equals `orderId`;
   *   - the table's `status` is `"occupied"` or `"waiting_payment"`.
   *
   * Returns `true` and resets `{status:'empty', currentOrderId:undefined}` on
   * success.  Returns `false` with **no state change** on any mismatch.
   */
  releaseTable: (tableId: string, orderId: string) => boolean;
};

const hasDuplicate = <T extends { id: string }>(records: T[]) => new Set(records.map(({ id }) => id)).size !== records.length;

const isPrimitiveNonemptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isNonnegativeInteger = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;
const isTableNumber = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 10;
const isOptionalString = (value: unknown): value is string | undefined => value === undefined || typeof value === "string";

const materializeRecord = (value: unknown): Record<string, unknown> | null => {
  if (!isPlainObject(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some((key) => !("value" in descriptors[key as keyof typeof descriptors]))) return null;
  return Object.fromEntries(Reflect.ownKeys(descriptors).map((key) => [key, descriptors[key as keyof typeof descriptors].value]));
};

const hasRecordIdentity = (value: Record<string, unknown>): value is Record<string, unknown> & { id: string; tenantId: string } =>
  isPrimitiveNonemptyString(value.id) && isPrimitiveNonemptyString(value.tenantId);

const isCatalogGroup = (value: Record<string, unknown>): value is Record<string, unknown> & CatalogGroup =>
  hasRecordIdentity(value) && isPrimitiveNonemptyString(value.name) && isFiniteNumber(value.sortOrder);

const isCatalogItem = (value: Record<string, unknown>): value is Record<string, unknown> & CatalogItem =>
  hasRecordIdentity(value)
  && isPrimitiveNonemptyString(value.groupId)
  && isPrimitiveNonemptyString(value.name)
  && isNonnegativeInteger(value.price)
  && typeof value.available === "boolean"
  && isFiniteNumber(value.sortOrder)
  && isFiniteNumber(value.createdAt)
  && isFiniteNumber(value.updatedAt)
  && isOptionalString(value.description)
  && isOptionalString(value.imageUrl);

const isPosTable = (value: Record<string, unknown>): value is Record<string, unknown> & PosTable =>
  hasRecordIdentity(value)
  && isPrimitiveNonemptyString(value.staffId)
  && isTableNumber(value.number)
  && (value.status === "empty" || value.status === "occupied" || value.status === "waiting_payment")
  && isFiniteNumber(value.openedAt)
  && isOptionalString(value.currentOrderId);

export const useCatalogTableStore = create<CatalogTableState>((set, get) => ({
  tenantId: null,
  catalogGroups: [],
  catalogItems: [],
  tables: [],
  replaceTenantData: (tenantId, data) => {
    try {
      if (!isPrimitiveNonemptyString(tenantId) || !isPlainObject(data)) return false;
      const { catalogGroups, catalogItems, tables } = data;
      if (!Array.isArray(catalogGroups) || !Array.isArray(catalogItems) || !Array.isArray(tables)) return false;

      const groups = catalogGroups.map(materializeRecord);
      const items = catalogItems.map(materializeRecord);
      const tenantTables = tables.map(materializeRecord);
      if (groups.some((record) => !record || !isCatalogGroup(record))
        || items.some((record) => !record || !isCatalogItem(record))
        || tenantTables.some((record) => !record || !isPosTable(record))) return false;

      const validGroups = groups as (Record<string, unknown> & CatalogGroup)[];
      const validItems = items as (Record<string, unknown> & CatalogItem)[];
      const validTables = tenantTables as (Record<string, unknown> & PosTable)[];

      if (
        hasDuplicate(validGroups) ||
        hasDuplicate(validItems) ||
        hasDuplicate(validTables) ||
        validGroups.some((record) => record.tenantId !== tenantId) ||
        validItems.some((record) => record.tenantId !== tenantId) ||
        validTables.some((record) => record.tenantId !== tenantId)
      ) return false;

      const groupIds = new Set(validGroups.map(({ id }) => id));
      if (
        validItems.some(({ groupId }) => !groupIds.has(groupId)) ||
        new Set(validTables.map(({ number }) => number)).size !== validTables.length
      ) return false;

      set({
        tenantId,
        catalogGroups: validGroups.map((record) => ({ ...record })),
        catalogItems: validItems.map((record) => ({ ...record })),
        tables: validTables.map((record) => ({ ...record })),
      });
      return true;
    } catch {
      return false;
    }
  },
  clear: () => set({ tenantId: null, catalogGroups: [], catalogItems: [], tables: [] }),
  itemsForGroup: (groupId) => get().catalogItems
    .filter((item) => item.groupId === groupId && item.available)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
    .map((item) => ({ ...item })),
  tableById: (id) => {
    const table = get().tables.find((record) => record.id === id);
    return table ? { ...table } : null;
  },
  occupyTable: (tableId, orderId, tenantId) => {
    if (!isPrimitiveNonemptyString(tableId) || !isPrimitiveNonemptyString(orderId) || !isPrimitiveNonemptyString(tenantId)) return false;
    if (get().tenantId !== tenantId) return false;
    const table = get().tables.find((t) => t.id === tableId);
    if (!table) return false;
    if (table.tenantId !== tenantId) return false;
    if (table.status !== "empty") return false;
    set({
      tables: get().tables.map((t) =>
        t.id === tableId
          ? { ...t, status: "occupied" as const, currentOrderId: orderId }
          : { ...t },
      ),
    });
    return true;
  },
  restoreOccupiedTable: (tableId, orderId, tenantId) => {
    if (!isPrimitiveNonemptyString(tableId) || !isPrimitiveNonemptyString(orderId) || !isPrimitiveNonemptyString(tenantId)) return false;
    if (get().tenantId !== tenantId) return false;
    const table = get().tables.find((t) => t.id === tableId);
    if (!table || table.tenantId !== tenantId) return false;
    if (table.status === "occupied" && table.currentOrderId === orderId) return true;
    if (table.status !== "empty") return false;
    set({
      tables: get().tables.map((t) =>
        t.id === tableId
          ? { ...t, status: "occupied" as const, currentOrderId: orderId }
          : { ...t },
      ),
    });
    return true;
  },
  releaseTable: (tableId, orderId) => {
    const table = get().tables.find((t) => t.id === tableId);
    if (!table) return false;
    if (table.status !== "occupied" && table.status !== "waiting_payment") return false;
    if (table.currentOrderId !== orderId) return false;
    set({
      tables: get().tables.map((t) =>
        t.id === tableId
          ? { ...t, status: "empty" as const, currentOrderId: undefined }
          : { ...t },
      ),
    });
    return true;
  },
}));
