import { beforeEach, expect, test } from "vitest";
import type { CatalogGroup, CatalogItem, PosTable } from "../../packages/pos-core/src/types";
import { useCatalogTableStore } from "./catalog-table-store";

const tenantId = "tenant-1";

const group = (id: string, sortOrder = 0): CatalogGroup => ({ id, tenantId, name: id, sortOrder });
const item = (id: string, groupId: string, overrides: Partial<CatalogItem> = {}): CatalogItem => ({
  id,
  tenantId,
  groupId,
  name: id,
  price: 1000,
  available: true,
  sortOrder: 0,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});
const table = (id: string, number: number): PosTable => ({
  id,
  tenantId,
  number,
  status: "empty",
  openedAt: 1,
  staffId: "staff-1",
});

beforeEach(() => {
  useCatalogTableStore.getState().clear();
});

test("loads valid tenant data atomically without retaining caller arrays", () => {
  const catalogGroups = [group("group-1")];
  const catalogItems = [item("item-1", "group-1")];
  const tables = [table("table-1", 1)];

  expect(useCatalogTableStore.getState().replaceTenantData(tenantId, { catalogGroups, catalogItems, tables })).toBe(true);
  catalogGroups.push(group("group-2"));
  catalogItems.push(item("item-2", "group-1"));
  tables.push(table("table-2", 2));

  expect(useCatalogTableStore.getState()).toMatchObject({
    tenantId,
    catalogGroups: [group("group-1")],
    catalogItems: [item("item-1", "group-1")],
    tables: [table("table-1", 1)],
  });
});

test.each([
  ["empty tenant", "", { catalogGroups: [group("group-1")], catalogItems: [], tables: [] }],
  ["duplicate group ID", tenantId, { catalogGroups: [group("group-1"), group("group-1")], catalogItems: [], tables: [] }],
  ["duplicate item ID", tenantId, { catalogGroups: [group("group-1")], catalogItems: [item("item-1", "group-1"), item("item-1", "group-1")], tables: [] }],
  ["duplicate table ID", tenantId, { catalogGroups: [], catalogItems: [], tables: [table("table-1", 1), table("table-1", 2)] }],
  ["tenant mismatch", tenantId, { catalogGroups: [{ ...group("group-1"), tenantId: "tenant-2" }], catalogItems: [], tables: [] }],
  ["missing group", tenantId, { catalogGroups: [], catalogItems: [item("item-1", "missing")], tables: [] }],
  ["duplicate table number", tenantId, { catalogGroups: [], catalogItems: [], tables: [table("table-1", 1), table("table-2", 1)] }],
])("rejects %s and preserves prior state", (_reason, inputTenantId, data) => {
  const prior = { catalogGroups: [group("prior-group")], catalogItems: [], tables: [table("prior-table", 9)] };
  expect(useCatalogTableStore.getState().replaceTenantData(tenantId, prior)).toBe(true);
  const before = useCatalogTableStore.getState();

  expect(useCatalogTableStore.getState().replaceTenantData(inputTenantId, data)).toBe(false);
  expect(useCatalogTableStore.getState()).toMatchObject({
    tenantId: before.tenantId,
    catalogGroups: before.catalogGroups,
    catalogItems: before.catalogItems,
    tables: before.tables,
  });
});

test("clear removes tenant-scoped data", () => {
  useCatalogTableStore.getState().replaceTenantData(tenantId, { catalogGroups: [group("group-1")], catalogItems: [], tables: [table("table-1", 1)] });

  useCatalogTableStore.getState().clear();

  expect(useCatalogTableStore.getState()).toMatchObject({ tenantId: null, catalogGroups: [], catalogItems: [], tables: [] });
});

test("itemsForGroup returns available items sorted without mutating state", () => {
  const data = {
    catalogGroups: [group("group-1")],
    catalogItems: [
      item("z", "group-1", { sortOrder: 1 }),
      item("a", "group-1", { sortOrder: 1 }),
      item("hidden", "group-1", { available: false }),
      item("other", "other-group"),
    ],
    tables: [],
  };
  data.catalogGroups.push(group("other-group"));
  useCatalogTableStore.getState().replaceTenantData(tenantId, data);
  const state = useCatalogTableStore.getState();
  const before = [...state.catalogItems];

  expect(state.itemsForGroup("group-1").map(({ id }) => id)).toEqual(["a", "z"]);
  expect(useCatalogTableStore.getState().catalogItems).toEqual(before);
});

test("tableById returns current table or null", () => {
  const target = table("table-1", 1);
  useCatalogTableStore.getState().replaceTenantData(tenantId, { catalogGroups: [], catalogItems: [], tables: [target] });

  expect(useCatalogTableStore.getState().tableById(target.id)).toEqual(target);
  expect(useCatalogTableStore.getState().tableById("missing")).toBeNull();
});
