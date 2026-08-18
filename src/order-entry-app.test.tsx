/**
 * order-entry-app.test.tsx
 *
 * TDD RED-first: App-level tests for the order-entry slice.
 *
 * 1. Selecting an empty table creates one open order and marks the table occupied.
 * 2. Selecting an already-occupied/invalid table does NOT replace the existing order or mutate anything.
 * 3. Menu + button adds a catalog item snapshot to the current open order.
 * 4. Pressing + on the same catalog item increments quantity instead of duplicating the line.
 * 5. Absent open order: + button does not mutate any store.
 */
import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Staff, Tenant } from "../packages/pos-core/src/types";
import type { PinHashVerifier } from "../packages/pos-core/src/auth";
import type { ProductBootstrap } from "./pos/product-bootstrap";
import { useTenantAuthStore } from "./stores/tenant-auth-store";
import { useCatalogTableStore } from "./stores/catalog-table-store";
import { useOrderPaymentStore } from "./stores/order-payment-store";

// ---------------------------------------------------------------------------
// Hoisted mock
// ---------------------------------------------------------------------------

const bootstrap = vi.hoisted(() => ({
  create: vi.fn<() => Promise<ProductBootstrap>>(
    () => new Promise<ProductBootstrap>(() => {}),
  ),
}));

vi.mock("@/pos/product-bootstrap", () => ({
  loadProductBootstrap: bootstrap.create,
}));

vi.mock("@/pos/dexie-hydrate", () => ({
  hydrateFromDexie: vi.fn(async () => null),
}));

import App from "./App";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const tenant: Tenant = {
  id: "tenant-demo",
  name: "Quán Demo",
  address: "1 Demo Street",
  phone: "0912345678",
  currency: "VND",
  defaultTax: 0,
  defaultSurcharge: 0,
  tableCount: 5,
  createdAt: 0,
};

const staffRecord: Staff = {
  id: "manager",
  tenantId: tenant.id,
  name: "Manager",
  role: "manager",
  pinHash:
    "v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  createdAt: 0,
};

const acceptAllVerifier: PinHashVerifier = async () => true;

function makeReadyBootstrap(): Promise<ProductBootstrap> {
  return Promise.resolve({
    kind: "ready",
    tenant,
    staff: [staffRecord],
    catalogGroups: [],
    catalogItems: [],
    tables: [],
    verifier: acceptAllVerifier,
    persistable: false,
  });
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

function seedCatalog() {
  useCatalogTableStore.getState().replaceTenantData(tenant.id, {
    catalogGroups: [
      { id: "g1", tenantId: tenant.id, name: "Cà phê", sortOrder: 1 },
    ],
    catalogItems: [
      {
        id: "coffee-black",
        tenantId: tenant.id,
        groupId: "g1",
        name: "Cà phê đen",
        price: 25_000,
        available: true,
        sortOrder: 1,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "lemon-tea",
        tenantId: tenant.id,
        groupId: "g1",
        name: "Trà chanh",
        price: 20_000,
        available: true,
        sortOrder: 2,
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    tables: [
      {
        id: "t1",
        tenantId: tenant.id,
        number: 1,
        status: "empty" as const,
        openedAt: 0,
        staffId: staffRecord.id,
      },
      {
        id: "t2",
        tenantId: tenant.id,
        number: 2,
        status: "occupied" as const,
        openedAt: 0,
        staffId: staffRecord.id,
        currentOrderId: "existing-order",
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Helper: render App, wait for shell
// ---------------------------------------------------------------------------

async function renderSignedIn() {
  bootstrap.create.mockImplementation(makeReadyBootstrap);
  render(<App />);
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Đăng nhập" }),
    ).toBeTruthy(),
  );
  // Sign in
  const select = screen.getByRole("combobox");
  fireEvent.change(select, { target: { value: staffRecord.id } });
  const pinInput = screen.getByLabelText("PIN");
  fireEvent.change(pinInput, { target: { value: "7890" } });
  const submitBtn = screen.getByRole("button", { name: /đăng nhập/i });
  await act(async () => {
    fireEvent.click(submitBtn);
  });
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: /^CafePOS$/ }),
    ).toBeTruthy(),
  );
}

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

beforeEach(() => {
  useTenantAuthStore.setState({ tenant: null, staff: null });
  useCatalogTableStore.getState().clear();
  useOrderPaymentStore.getState().clearCurrentOrder();
  bootstrap.create.mockClear();
  bootstrap.create.mockImplementation(
    () => new Promise<ProductBootstrap>(() => {}),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Selecting an empty table creates one open order + marks it occupied
// ---------------------------------------------------------------------------

test("order-entry 1: selecting an empty table creates one open order and marks table occupied", async () => {
  await renderSignedIn();

  act(() => {
    seedCatalog();
  });

  // Bàn 1 is empty — click it (both mobile and desktop render; click first match)
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: /Bàn 1/i }).length,
    ).toBeGreaterThan(0),
  );

  act(() => {
    fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1.*Trống/i })[0]);
  });

  // A currentOrder must now exist in the store
  await waitFor(() => {
    const order = useOrderPaymentStore.getState().currentOrder;
    expect(order).not.toBeNull();
    expect(order!.status).toBe("open");
    expect(order!.tableId).toBe("t1");
    expect(order!.tenantId).toBe(tenant.id);
  });

  // The table must now be occupied
  const t = useCatalogTableStore.getState().tableById("t1");
  expect(t!.status).toBe("occupied");
  expect(t!.currentOrderId).toBe(
    useOrderPaymentStore.getState().currentOrder!.id,
  );
});

test("order-entry 1b: selecting an empty table creates exactly one order — a second createOpenOrder call is rejected", async () => {
  await renderSignedIn();
  act(() => { seedCatalog(); });

  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: /Bàn 1.*Trống/i }).length).toBeGreaterThan(0),
  );

  act(() => {
    fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1.*Trống/i })[0]);
  });

  await waitFor(() =>
    expect(useOrderPaymentStore.getState().currentOrder).not.toBeNull(),
  );

  const firstOrder = useOrderPaymentStore.getState().currentOrder!;

  // Attempt to create a second order for same table — must not replace the first
  const secondOk = useOrderPaymentStore.getState().createOpenOrder({
    id: "order-second",
    tenantId: tenant.id,
    tableId: "t1",
    staffId: staffRecord.id,
    status: "open",
    items: [],
    subtotal: 0,
    discount: 0,
    discountType: "amount",
    total: 0,
    createdAt: 1,
  });
  expect(secondOk).toBe(false);
  expect(useOrderPaymentStore.getState().currentOrder!.id).toBe(firstOrder.id);
});

// ---------------------------------------------------------------------------
// 2. Selecting an occupied table does NOT replace existing order / mutate store
// ---------------------------------------------------------------------------

test("order-entry 2: clicking an already-occupied table does not create a new order or mutate the existing order", async () => {
  await renderSignedIn();
  act(() => { seedCatalog(); });

  // Seed an existing order for the empty table first
  act(() => {
    useOrderPaymentStore.getState().createOpenOrder({
      id: "existing-order-id",
      tenantId: tenant.id,
      tableId: "t1",
      staffId: staffRecord.id,
      status: "open",
      items: [],
      subtotal: 0,
      discount: 0,
      discountType: "amount",
      total: 0,
      createdAt: 0,
    });
    // Mark t1 occupied to match
    useCatalogTableStore.getState().replaceTenantData(tenant.id, {
      catalogGroups: [{ id: "g1", tenantId: tenant.id, name: "Cà phê", sortOrder: 1 }],
      catalogItems: [
        {
          id: "coffee-black", tenantId: tenant.id, groupId: "g1", name: "Cà phê đen",
          price: 25_000, available: true, sortOrder: 1, createdAt: 0, updatedAt: 0,
        },
      ],
      tables: [
        {
          id: "t1", tenantId: tenant.id, number: 1, status: "occupied" as const,
          openedAt: 0, staffId: staffRecord.id, currentOrderId: "existing-order-id",
        },
      ],
    });
  });

  const orderBefore = useOrderPaymentStore.getState().currentOrder;
  const tablesBefore = JSON.stringify(useCatalogTableStore.getState().tables);

  // Click the occupied table button — it must NOT replace the order
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: /Bàn 1/i }).length).toBeGreaterThan(0),
  );
  act(() => {
    fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  });

  // Allow any potential state update to settle
  await new Promise((r) => setTimeout(r, 50));

  expect(useOrderPaymentStore.getState().currentOrder).toBe(orderBefore);
  expect(JSON.stringify(useCatalogTableStore.getState().tables)).toBe(tablesBefore);
});

// ---------------------------------------------------------------------------
// 3. Menu + adds catalog item snapshot to current open order
// ---------------------------------------------------------------------------

test("order-entry 3a: clicking + on a menu item adds it to the current open order", async () => {
  await renderSignedIn();
  act(() => { seedCatalog(); });

  // Create an open order first by selecting the empty table
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: /Bàn 1.*Trống/i }).length).toBeGreaterThan(0),
  );
  act(() => {
    fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1.*Trống/i })[0]);
  });
  await waitFor(() =>
    expect(useOrderPaymentStore.getState().currentOrder).not.toBeNull(),
  );

  // Click + for Cà phê đen in the menu (use aria-label)
  const addBtn = screen.getAllByRole("button", { name: /\+ Cà phê đen/i })[0];
  act(() => {
    fireEvent.click(addBtn);
  });

  await waitFor(() => {
    const order = useOrderPaymentStore.getState().currentOrder;
    expect(order).not.toBeNull();
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0].catalogItemId).toBe("coffee-black");
    expect(order!.items[0].name).toBe("Cà phê đen");
    expect(order!.items[0].price).toBe(25_000);
    expect(order!.items[0].quantity).toBe(1);
    expect(order!.total).toBe(25_000);
  });
});

test("order-entry 3b: clicking + on the same catalog item increments quantity (no duplicate line)", async () => {
  await renderSignedIn();
  act(() => { seedCatalog(); });

  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: /Bàn 1.*Trống/i }).length).toBeGreaterThan(0),
  );
  act(() => {
    fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1.*Trống/i })[0]);
  });
  await waitFor(() =>
    expect(useOrderPaymentStore.getState().currentOrder).not.toBeNull(),
  );

  const addBtn = () => screen.getAllByRole("button", { name: /\+ Cà phê đen/i })[0];

  act(() => { fireEvent.click(addBtn()); });
  await waitFor(() =>
    expect(useOrderPaymentStore.getState().currentOrder!.items).toHaveLength(1),
  );

  act(() => { fireEvent.click(addBtn()); });
  await waitFor(() => {
    const order = useOrderPaymentStore.getState().currentOrder!;
    // Still one line — quantity incremented
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.total).toBe(50_000);
  });
});

test("order-entry 3c: adding two different items creates two separate lines with correct totals", async () => {
  await renderSignedIn();
  act(() => { seedCatalog(); });

  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: /Bàn 1.*Trống/i }).length).toBeGreaterThan(0),
  );
  act(() => {
    fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1.*Trống/i })[0]);
  });
  await waitFor(() =>
    expect(useOrderPaymentStore.getState().currentOrder).not.toBeNull(),
  );

  act(() => {
    fireEvent.click(screen.getAllByRole("button", { name: /\+ Cà phê đen/i })[0]);
  });
  await waitFor(() =>
    expect(useOrderPaymentStore.getState().currentOrder!.items).toHaveLength(1),
  );

  act(() => {
    fireEvent.click(screen.getAllByRole("button", { name: /\+ Trà chanh/i })[0]);
  });
  await waitFor(() => {
    const order = useOrderPaymentStore.getState().currentOrder!;
    expect(order.items).toHaveLength(2);
    expect(order.total).toBe(45_000); // 25_000 + 20_000
  });
});

// ---------------------------------------------------------------------------
// 4. Absent open order: + button does not mutate store
// ---------------------------------------------------------------------------

test("order-entry 4: clicking + when no open order exists does not create an order or mutate store", async () => {
  await renderSignedIn();
  act(() => { seedCatalog(); });

  // No table selected, so no open order
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();

  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: /\+ Cà phê đen/i }).length).toBeGreaterThan(0),
  );

  act(() => {
    fireEvent.click(screen.getAllByRole("button", { name: /\+ Cà phê đen/i })[0]);
  });

  await new Promise((r) => setTimeout(r, 30));
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
});
