/**
 * menu-grid-order-entry.test.tsx
 *
 * TDD RED-first: focused tests for MenuGrid + button wiring to the order store.
 *
 * 1. + click adds catalog item snapshot when open order exists.
 * 2. Same catalogItemId → increment quantity via existing store line (no duplicate).
 * 3. Total reflects added items.
 * 4. Absent open order → + button click does not mutate store (fail closed).
 */
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CatalogGroup, CatalogItem } from "../../../packages/pos-core/src/types";
import { useOrderPaymentStore } from "../../stores/order-payment-store";
import { MenuGrid } from "./MenuGrid";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const tenantId = "tenant-demo";
const orderId = "order-1";
const staffId = "staff-1";

const groups: CatalogGroup[] = [
  { id: "g1", tenantId, name: "Cà phê", sortOrder: 1 },
];

const items: CatalogItem[] = [
  {
    id: "coffee-black",
    tenantId,
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
    tenantId,
    groupId: "g1",
    name: "Trà chanh",
    price: 20_000,
    available: true,
    sortOrder: 2,
    createdAt: 0,
    updatedAt: 0,
  },
];

function makeOpenOrder(overrides = {}) {
  return {
    id: orderId,
    tenantId,
    tableId: "table-1",
    staffId,
    status: "open" as const,
    items: [],
    subtotal: 0,
    discount: 0,
    discountType: "amount" as const,
    total: 0,
    createdAt: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset store before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  useOrderPaymentStore.getState().clearCurrentOrder();
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("MenuGrid – + button wiring (order-entry)", () => {
  // -------------------------------------------------------------------------
  // 1. Adds item when open order exists
  // -------------------------------------------------------------------------

  it("clicking + adds a catalog item snapshot to the current open order", () => {
    useOrderPaymentStore.getState().selectOpenOrder(makeOpenOrder());

    render(<MenuGrid groups={groups} items={items} />);

    fireEvent.click(screen.getByRole("button", { name: /\+ Cà phê đen/i }));

    const order = useOrderPaymentStore.getState().currentOrder;
    expect(order).not.toBeNull();
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0].catalogItemId).toBe("coffee-black");
    expect(order!.items[0].name).toBe("Cà phê đen");
    expect(order!.items[0].price).toBe(25_000);
    expect(order!.items[0].quantity).toBe(1);
  });

  it("total reflects the added item's price", () => {
    useOrderPaymentStore.getState().selectOpenOrder(makeOpenOrder());

    render(<MenuGrid groups={groups} items={items} />);

    fireEvent.click(screen.getByRole("button", { name: /\+ Cà phê đen/i }));

    expect(useOrderPaymentStore.getState().currentOrder!.total).toBe(25_000);
  });

  // -------------------------------------------------------------------------
  // 2. Increments quantity when same catalogItemId already exists
  // -------------------------------------------------------------------------

  it("clicking + twice on the same item increments quantity to 2 (no duplicate line)", () => {
    useOrderPaymentStore.getState().selectOpenOrder(makeOpenOrder());

    render(<MenuGrid groups={groups} items={items} />);

    const addBtn = screen.getByRole("button", { name: /\+ Cà phê đen/i });
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);

    const order = useOrderPaymentStore.getState().currentOrder!;
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.total).toBe(50_000);
  });

  it("clicking + on different items creates two separate lines", () => {
    useOrderPaymentStore.getState().selectOpenOrder(makeOpenOrder());

    render(<MenuGrid groups={groups} items={items} />);

    fireEvent.click(screen.getByRole("button", { name: /\+ Cà phê đen/i }));
    fireEvent.click(screen.getByRole("button", { name: /\+ Trà chanh/i }));

    const order = useOrderPaymentStore.getState().currentOrder!;
    expect(order.items).toHaveLength(2);
    expect(order.total).toBe(45_000); // 25_000 + 20_000
  });

  // -------------------------------------------------------------------------
  // 3. Absent open order → + does not mutate store
  // -------------------------------------------------------------------------

  it("clicking + when there is no open order does not create an order or mutate the store", () => {
    // No order loaded — store has currentOrder = null
    render(<MenuGrid groups={groups} items={items} />);

    fireEvent.click(screen.getByRole("button", { name: /\+ Cà phê đen/i }));

    expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
  });

  it("clicking + when there is no open order does not throw", () => {
    render(<MenuGrid groups={groups} items={items} />);

    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: /\+ Cà phê đen/i })),
    ).not.toThrow();
  });
});
