/**
 * occupy-table.test.ts
 *
 * TDD RED-first tests for catalog-table-store.occupyTable.
 *
 * Requirements:
 *   1. occupyTable succeeds only for an empty table with matching tenantId.
 *   2. Failure returns false with NO state mutation in any scenario.
 *   3. No mutation on rejection: wrong table, occupied table, wrong/missing tenantId.
 */
import { beforeEach, describe, expect, test } from "vitest";
import type { CatalogGroup, CatalogItem, PosTable } from "../../packages/pos-core/src/types";
import { useCatalogTableStore } from "./catalog-table-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const tenantId = "tenant-1";
const staffId = "staff-1";
const tableId = "table-1";
const orderId = "order-1";

function makeEmptyTable(overrides: Partial<PosTable> = {}): PosTable {
  return {
    id: tableId,
    tenantId,
    number: 1,
    status: "empty",
    openedAt: 1,
    staffId,
    ...overrides,
  };
}

function seedTable(overrides: Partial<PosTable> = {}) {
  useCatalogTableStore.getState().replaceTenantData(tenantId, {
    catalogGroups: [] as CatalogGroup[],
    catalogItems: [] as CatalogItem[],
    tables: [makeEmptyTable(overrides)],
  });
}

// ---------------------------------------------------------------------------
// Reset store before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  useCatalogTableStore.getState().clear();
});

// ---------------------------------------------------------------------------
// 1. Success path
// ---------------------------------------------------------------------------

describe("occupyTable – success path", () => {
  test("returns true and sets status=occupied + currentOrderId when table is empty and tenantId matches", () => {
    seedTable();
    const result = useCatalogTableStore.getState().occupyTable(tableId, orderId, tenantId);
    expect(result).toBe(true);
    const t = useCatalogTableStore.getState().tableById(tableId);
    expect(t).not.toBeNull();
    expect(t!.status).toBe("occupied");
    expect(t!.currentOrderId).toBe(orderId);
  });

  test("does not mutate any other table when occupying one table", () => {
    const other: PosTable = {
      id: "table-2",
      tenantId,
      number: 2,
      status: "empty",
      openedAt: 1,
      staffId,
    };
    useCatalogTableStore.getState().replaceTenantData(tenantId, {
      catalogGroups: [] as CatalogGroup[],
      catalogItems: [] as CatalogItem[],
      tables: [makeEmptyTable(), other],
    });
    useCatalogTableStore.getState().occupyTable(tableId, orderId, tenantId);
    const t2 = useCatalogTableStore.getState().tableById("table-2");
    expect(t2!.status).toBe("empty");
    expect(t2!.currentOrderId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Rejection – wrong / missing table
// ---------------------------------------------------------------------------

describe("occupyTable – rejects wrong table with no mutation", () => {
  test("returns false when tableId does not exist in store", () => {
    seedTable();
    const tablesBefore = JSON.stringify(useCatalogTableStore.getState().tables);
    const result = useCatalogTableStore.getState().occupyTable("nonexistent", orderId, tenantId);
    expect(result).toBe(false);
    expect(JSON.stringify(useCatalogTableStore.getState().tables)).toBe(tablesBefore);
  });

  test("returns false when table tenantId does not match supplied tenantId", () => {
    seedTable();
    const tablesBefore = JSON.stringify(useCatalogTableStore.getState().tables);
    const result = useCatalogTableStore.getState().occupyTable(tableId, orderId, "wrong-tenant");
    expect(result).toBe(false);
    expect(JSON.stringify(useCatalogTableStore.getState().tables)).toBe(tablesBefore);
  });
});

// ---------------------------------------------------------------------------
// 3. Rejection – table is not empty
// ---------------------------------------------------------------------------

describe("occupyTable – rejects non-empty table with no mutation", () => {
  test("returns false when table is already occupied", () => {
    seedTable({ status: "occupied", currentOrderId: "existing-order" });
    const tablesBefore = JSON.stringify(useCatalogTableStore.getState().tables);
    const result = useCatalogTableStore.getState().occupyTable(tableId, orderId, tenantId);
    expect(result).toBe(false);
    expect(JSON.stringify(useCatalogTableStore.getState().tables)).toBe(tablesBefore);
  });

  test("returns false when table is in waiting_payment status", () => {
    seedTable({ status: "waiting_payment", currentOrderId: "existing-order" });
    const tablesBefore = JSON.stringify(useCatalogTableStore.getState().tables);
    const result = useCatalogTableStore.getState().occupyTable(tableId, orderId, tenantId);
    expect(result).toBe(false);
    expect(JSON.stringify(useCatalogTableStore.getState().tables)).toBe(tablesBefore);
  });
});

// ---------------------------------------------------------------------------
// 4. Rejection – invalid inputs
// ---------------------------------------------------------------------------

describe("occupyTable – rejects invalid/missing inputs with no mutation", () => {
  test("returns false when store has no data loaded (empty store)", () => {
    // Store is empty (cleared in beforeEach)
    const result = useCatalogTableStore.getState().occupyTable(tableId, orderId, tenantId);
    expect(result).toBe(false);
  });

  test("returns false when orderId is empty string", () => {
    seedTable();
    const tablesBefore = JSON.stringify(useCatalogTableStore.getState().tables);
    const result = useCatalogTableStore.getState().occupyTable(tableId, "", tenantId);
    expect(result).toBe(false);
    expect(JSON.stringify(useCatalogTableStore.getState().tables)).toBe(tablesBefore);
  });

  test("returns false when tableId is empty string", () => {
    seedTable();
    const tablesBefore = JSON.stringify(useCatalogTableStore.getState().tables);
    const result = useCatalogTableStore.getState().occupyTable("", orderId, tenantId);
    expect(result).toBe(false);
    expect(JSON.stringify(useCatalogTableStore.getState().tables)).toBe(tablesBefore);
  });
});
