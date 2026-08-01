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

test("loads valid tenant data atomically without retaining caller records", () => {
  const catalogGroups = [group("group-1")];
  const catalogItems = [item("item-1", "group-1")];
  const tables = [table("table-1", 1)];

  expect(useCatalogTableStore.getState().replaceTenantData(tenantId, { catalogGroups, catalogItems, tables })).toBe(true);
  catalogGroups.push(group("group-2"));
  catalogItems.push(item("item-2", "group-1"));
  tables.push(table("table-2", 2));
  catalogGroups[0].name = "mutated group";
  catalogItems[0].name = "mutated item";
  tables[0].status = "occupied";

  expect(useCatalogTableStore.getState()).toMatchObject({
    tenantId,
    catalogGroups: [group("group-1")],
    catalogItems: [item("item-1", "group-1")],
    tables: [table("table-1", 1)],
  });
});

test("read helpers return record copies", () => {
  useCatalogTableStore.getState().replaceTenantData(tenantId, {
    catalogGroups: [group("group-1")],
    catalogItems: [item("item-1", "group-1")],
    tables: [table("table-1", 1)],
  });

  const [returnedItem] = useCatalogTableStore.getState().itemsForGroup("group-1");
  const returnedTable = useCatalogTableStore.getState().tableById("table-1");
  returnedItem.name = "mutated item";
  returnedTable!.status = "occupied";

  expect(useCatalogTableStore.getState().catalogItems[0].name).toBe("item-1");
  expect(useCatalogTableStore.getState().tables[0].status).toBe("empty");
});

test.each([
  ["throwing getter", Object.defineProperty({}, "catalogGroups", { get: () => { throw new Error("hostile getter"); } })],
  ["throwing Proxy", new Proxy({}, { getPrototypeOf: () => { throw new Error("hostile proxy"); } })],
])("rejects hostile %s and preserves prior state", (_reason, hostileData) => {
  const prior = { catalogGroups: [group("prior-group")], catalogItems: [], tables: [table("prior-table", 9)] };
  expect(useCatalogTableStore.getState().replaceTenantData(tenantId, prior)).toBe(true);
  const before = useCatalogTableStore.getState();

  let result: boolean | undefined;
  expect(() => { result = useCatalogTableStore.getState().replaceTenantData(tenantId, hostileData as never); }).not.toThrow();
  expect(result).toBe(false);
  expect(useCatalogTableStore.getState()).toMatchObject({
    tenantId: before.tenantId,
    catalogGroups: before.catalogGroups,
    catalogItems: before.catalogItems,
    tables: before.tables,
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

test.each([
  ["null tenant ID", null, { catalogGroups: [], catalogItems: [], tables: [] }],
  ["number tenant ID", 123, { catalogGroups: [], catalogItems: [], tables: [] }],
  ["whitespace tenant ID", "   ", { catalogGroups: [], catalogItems: [], tables: [] }],
  ["null data", tenantId, null],
  ["non-object data", tenantId, "data"],
  ["missing catalogGroups", tenantId, { catalogItems: [], tables: [] }],
  ["non-array catalogGroups", tenantId, { catalogGroups: {}, catalogItems: [], tables: [] }],
  ["missing catalogItems", tenantId, { catalogGroups: [], tables: [] }],
  ["non-array catalogItems", tenantId, { catalogGroups: [], catalogItems: {}, tables: [] }],
  ["missing tables", tenantId, { catalogGroups: [], catalogItems: [] }],
  ["non-array tables", tenantId, { catalogGroups: [], catalogItems: [], tables: {} }],
  ["null catalog group record", tenantId, { catalogGroups: [null], catalogItems: [], tables: [] }],
  ["null catalog item record", tenantId, { catalogGroups: [], catalogItems: [null], tables: [] }],
  ["null table record", tenantId, { catalogGroups: [], catalogItems: [], tables: [null] }],
])("rejects malformed %s and preserves prior state", (_reason, inputTenantId, data) => {
  const prior = { catalogGroups: [group("prior-group")], catalogItems: [], tables: [table("prior-table", 9)] };
  expect(useCatalogTableStore.getState().replaceTenantData(tenantId, prior)).toBe(true);
  const before = useCatalogTableStore.getState();

  expect(useCatalogTableStore.getState().replaceTenantData(inputTenantId as string, data as never)).toBe(false);
  expect(useCatalogTableStore.getState()).toMatchObject({
    tenantId: before.tenantId,
    catalogGroups: before.catalogGroups,
    catalogItems: before.catalogItems,
    tables: before.tables,
  });
});

test("rejects inherited identity records and preserves prior state", () => {
  const inherited = Object.create(group("inherited-group")) as CatalogGroup;
  const prior = { catalogGroups: [group("prior-group")], catalogItems: [], tables: [table("prior-table", 9)] };
  expect(useCatalogTableStore.getState().replaceTenantData(tenantId, prior)).toBe(true);
  const before = useCatalogTableStore.getState();

  expect(useCatalogTableStore.getState().replaceTenantData(tenantId, { catalogGroups: [inherited], catalogItems: [], tables: [] })).toBe(false);
  expect(useCatalogTableStore.getState()).toMatchObject({ tenantId: before.tenantId, catalogGroups: before.catalogGroups, catalogItems: before.catalogItems, tables: before.tables });
});

test.each([
  ["changing getter", Object.defineProperty({ ...group("group-1") }, "name", { enumerable: true, get: (() => { let reads = 0; return () => `name-${++reads}`; })() })],
  ["throwing getter", Object.defineProperty({ ...group("group-1") }, "name", { enumerable: true, get: () => { throw new Error("hostile getter"); } })],
])("rejects accessor record with %s and preserves prior state", (_reason, accessorRecord) => {
  const prior = { catalogGroups: [group("prior-group")], catalogItems: [], tables: [table("prior-table", 9)] };
  expect(useCatalogTableStore.getState().replaceTenantData(tenantId, prior)).toBe(true);
  const before = useCatalogTableStore.getState();

  let result: boolean | undefined;
  expect(() => { result = useCatalogTableStore.getState().replaceTenantData(tenantId, { catalogGroups: [accessorRecord as CatalogGroup], catalogItems: [], tables: [] }); }).not.toThrow();
  expect(result).toBe(false);
  expect(useCatalogTableStore.getState()).toMatchObject({ tenantId: before.tenantId, catalogGroups: before.catalogGroups, catalogItems: before.catalogItems, tables: before.tables });
});

test.each([
  ["group name", { catalogGroups: [{ ...group("group-1"), name: "" }], catalogItems: [], tables: [] }],
  ["group sortOrder", { catalogGroups: [{ ...group("group-1"), sortOrder: Number.NaN }], catalogItems: [], tables: [] }],
  ["item name", { catalogGroups: [group("group-1")], catalogItems: [item("item-1", "group-1", { name: "" })], tables: [] }],
  ["item price", { catalogGroups: [group("group-1")], catalogItems: [item("item-1", "group-1", { price: 1.5 })], tables: [] }],
  ["item available", { catalogGroups: [group("group-1")], catalogItems: [item("item-1", "group-1", { available: "true" as never })], tables: [] }],
  ["item sortOrder", { catalogGroups: [group("group-1")], catalogItems: [item("item-1", "group-1", { sortOrder: Number.POSITIVE_INFINITY })], tables: [] }],
  ["item createdAt", { catalogGroups: [group("group-1")], catalogItems: [item("item-1", "group-1", { createdAt: Number.NaN })], tables: [] }],
  ["item updatedAt", { catalogGroups: [group("group-1")], catalogItems: [item("item-1", "group-1", { updatedAt: Number.NaN })], tables: [] }],
  ["item description", { catalogGroups: [group("group-1")], catalogItems: [item("item-1", "group-1", { description: 1 as never })], tables: [] }],
  ["item imageUrl", { catalogGroups: [group("group-1")], catalogItems: [item("item-1", "group-1", { imageUrl: 1 as never })], tables: [] }],
  ["table number low", { catalogGroups: [], catalogItems: [], tables: [table("table-1", 0)] }],
  ["table number high", { catalogGroups: [], catalogItems: [], tables: [table("table-1", 11)] }],
  ["table status", { catalogGroups: [], catalogItems: [], tables: [{ ...table("table-1", 1), status: "closed" as never }] }],
  ["table openedAt", { catalogGroups: [], catalogItems: [], tables: [{ ...table("table-1", 1), openedAt: Number.NaN }] }],
  ["table staffId", { catalogGroups: [], catalogItems: [], tables: [{ ...table("table-1", 1), staffId: "" }] }],
  ["table currentOrderId", { catalogGroups: [], catalogItems: [], tables: [{ ...table("table-1", 1), currentOrderId: 1 as never }] }],
])("rejects invalid %s and preserves prior state", (_reason, data) => {
  const prior = { catalogGroups: [group("prior-group")], catalogItems: [], tables: [table("prior-table", 9)] };
  expect(useCatalogTableStore.getState().replaceTenantData(tenantId, prior)).toBe(true);
  const before = useCatalogTableStore.getState();

  expect(useCatalogTableStore.getState().replaceTenantData(tenantId, data)).toBe(false);
  expect(useCatalogTableStore.getState()).toMatchObject({ tenantId: before.tenantId, catalogGroups: before.catalogGroups, catalogItems: before.catalogItems, tables: before.tables });
});

test("loads valid normal core-shaped records", () => {
  expect(useCatalogTableStore.getState().replaceTenantData(tenantId, {
    catalogGroups: [group("group-1", 3)],
    catalogItems: [item("item-1", "group-1", { description: "desc", imageUrl: "https://example.test/image.png" })],
    tables: [{ ...table("table-1", 10), status: "waiting_payment", currentOrderId: "order-1" }],
  })).toBe(true);
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
