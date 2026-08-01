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

export const useCatalogTableStore = create<CatalogTableState>((set, get) => ({
  tenantId: null,
  catalogGroups: [],
  catalogItems: [],
  tables: [],
  replaceTenantData: (tenantId, data) => {
    if (
      !tenantId.trim() ||
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

    set({ tenantId, catalogGroups: [...data.catalogGroups], catalogItems: [...data.catalogItems], tables: [...data.tables] });
    return true;
  },
  clear: () => set({ tenantId: null, catalogGroups: [], catalogItems: [], tables: [] }),
  itemsForGroup: (groupId) => get().catalogItems
    .filter((item) => item.groupId === groupId && item.available)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)),
  tableById: (id) => get().tables.find((table) => table.id === id) ?? null,
}));
