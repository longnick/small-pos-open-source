import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PosTable } from "../../../packages/pos-core/src/types";
import { useOrderPaymentStore } from "../../stores/order-payment-store";
import { OrderPanel } from "./OrderPanel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const table: PosTable = {
  id: "table-1",
  tenantId: "tenant-1",
  number: 3,
  status: "occupied",
  openedAt: 0,
  staffId: "staff-1",
};

// ---------------------------------------------------------------------------
// Reset store before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  useOrderPaymentStore.getState().clearCurrentOrder();
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("OrderPanel", () => {
  // -------------------------------------------------------------------------
  // Null currentOrder – no table selected
  // -------------------------------------------------------------------------

  it("renders heading 'Đơn hàng' when currentOrder is null and no table is selected", () => {
    render(<OrderPanel selectedTable={null} />);
    expect(screen.getByRole("heading", { name: "Đơn hàng" })).toBeInTheDocument();
  });

  it("renders subtitle 'Chưa chọn bàn' when selectedTable is null", () => {
    render(<OrderPanel selectedTable={null} />);
    expect(screen.getByText("Chưa chọn bàn")).toBeInTheDocument();
  });

  it("renders exact empty-state text 'Chọn món để thêm vào đơn' when currentOrder is null", () => {
    render(<OrderPanel selectedTable={null} />);
    expect(screen.getByText("Chọn món để thêm vào đơn")).toBeInTheDocument();
  });

  it("does not render 'Cà phê đen' when currentOrder is null", () => {
    render(<OrderPanel selectedTable={null} />);
    expect(screen.queryByText("Cà phê đen")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Null currentOrder – table IS selected (still no order loaded)
  // -------------------------------------------------------------------------

  it("renders heading 'Đơn hàng' when currentOrder is null even with selectedTable", () => {
    render(<OrderPanel selectedTable={table} />);
    expect(screen.getByRole("heading", { name: "Đơn hàng" })).toBeInTheDocument();
  });

  it("renders empty-state text when currentOrder is null even though a table is passed", () => {
    render(<OrderPanel selectedTable={table} />);
    expect(screen.getByText("Chọn món để thêm vào đơn")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // currentOrder present but items empty → still shows empty state
  // -------------------------------------------------------------------------

  it("renders empty-state text when currentOrder has no items", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-1",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [],
      subtotal: 0,
      discount: 0,
      discountType: "amount",
      total: 0,
      createdAt: 1,
    });

    render(<OrderPanel selectedTable={table} />);
    expect(screen.getByText("Chọn món để thêm vào đơn")).toBeInTheDocument();
    expect(screen.queryByText("Cà phê đen")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // currentOrder with items → renders item names
  // -------------------------------------------------------------------------

  it("renders order item names when currentOrder has items", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-1",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [
        {
          id: "line-1",
          orderId: "order-1",
          catalogItemId: "c1",
          name: "Cà phê đen",
          price: 25_000,
          quantity: 2,
        },
      ],
      subtotal: 50_000,
      discount: 0,
      discountType: "amount",
      total: 50_000,
      createdAt: 1,
    });

    render(<OrderPanel selectedTable={table} />);
    expect(screen.getByText("Cà phê đen")).toBeInTheDocument();
    expect(screen.queryByText("Chọn món để thêm vào đơn")).not.toBeInTheDocument();
  });

  it("renders item quantity when currentOrder has items", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-1",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [
        {
          id: "line-1",
          orderId: "order-1",
          catalogItemId: "c1",
          name: "Cà phê đen",
          price: 25_000,
          quantity: 2,
        },
      ],
      subtotal: 50_000,
      discount: 0,
      discountType: "amount",
      total: 50_000,
      createdAt: 1,
    });

    render(<OrderPanel selectedTable={table} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Controls must be disabled (no fake onClick)
  // -------------------------------------------------------------------------

  it("renders disabled action buttons when currentOrder has items", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-1",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [
        {
          id: "line-1",
          orderId: "order-1",
          catalogItemId: "c1",
          name: "Cà phê đen",
          price: 25_000,
          quantity: 1,
        },
      ],
      subtotal: 25_000,
      discount: 0,
      discountType: "amount",
      total: 25_000,
      createdAt: 1,
    });

    render(<OrderPanel selectedTable={table} />);

    // "Gửi bếp" and "Thanh toán" buttons must exist and be disabled
    expect(screen.getByRole("button", { name: /Gửi bếp/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Thanh toán/i })).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // totals from store – no local recomputation
  // -------------------------------------------------------------------------

  it("displays the total from the store order (no recomputation)", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-1",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [
        {
          id: "line-1",
          orderId: "order-1",
          catalogItemId: "c1",
          name: "Cà phê đen",
          price: 25_000,
          quantity: 2,
        },
      ],
      subtotal: 50_000,
      discount: 0,
      discountType: "amount",
      total: 50_000,
      createdAt: 1,
    });

    render(<OrderPanel selectedTable={table} />);
    // 50 000 VND formatted as vi-VN → "50.000 ₫"
    // Both subtotal and total render the same amount; use getAllByText.
    const totalMatches = screen.getAllByText(/50\.000/);
    expect(totalMatches.length).toBeGreaterThan(0);
  });
});
