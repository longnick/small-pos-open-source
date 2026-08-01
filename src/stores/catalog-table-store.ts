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
};

const hasDuplicate = <T extends { id: string }>(records: T[]) => new Set(records.map(({ id }) => id)).size !== records.length;

const isPrimitiveNonemptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";
const hasRecordIdentity = (value: unknown): value is Record<string, unknown> & { id: string; tenantId: string } =>
  isRecord(value) && isPrimitiveNonemptyString(value.id) && isPrimitiveNonemptyString(value.tenantId);

const isTenantData = (value: unknown): value is TenantData => {
  if (!isPlainObject(value) || !Array.isArray(value.catalogGroups) || !Array.isArray(value.catalogItems) || !Array.isArray(value.tables)) return false;

  return value.catalogGroups.every(hasRecordIdentity)
    && value.catalogItems.every((record) => isRecord(record) && hasRecordIdentity(record) && isPrimitiveNonemptyString(record["groupId"]))
    && value.tables.every((record) => isRecord(record) && hasRecordIdentity(record) && typeof record["number"] === "number" && Number.isFinite(record["number"]));
};

export const useCatalogTableStore = create<CatalogTableState>((set, get) => ({
  tenantId: null,
  catalogGroups: [],
  catalogItems: [],
  tables: [],
  replaceTenantData: (tenantId, data) => {
    try {
      if (!isPrimitiveNonemptyString(tenantId) || !isTenantData(data)) return false;

      if (
        hasDuplicate(data.catalogGroups) ||
        hasDuplicate(data.catalogItems) ||
        hasDuplicate(data.tables) ||
        data.catalogGroups.some((record) => record.tenantId !== tenantId) ||
        data.catalogItems.some((record) => record.tenantId !== tenantId) ||
        data.tables.some((record) => record.tenantId !== tenantId)
      ) return false;

      const groupIds = new Set(data.catalogGroups.map(({ id }) => id));
      if (
        data.catalogItems.some(({ groupId }) => !groupIds.has(groupId)) ||
        new Set(data.tables.map(({ number }) => number)).size !== data.tables.length
      ) return false;

      set({
        tenantId,
        catalogGroups: data.catalogGroups.map((record) => ({ ...record })),
        catalogItems: data.catalogItems.map((record) => ({ ...record })),
        tables: data.tables.map((record) => ({ ...record })),
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
}));
