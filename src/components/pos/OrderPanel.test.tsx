import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
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

  it("exposes the empty order state as a Vietnamese region", () => {
    render(<OrderPanel selectedTable={null} />);
    expect(
      screen.getByRole("region", { name: "Chọn món để thêm vào đơn" }),
    ).toBeTruthy();
    expect(screen.getByTestId("order-empty-state")).toHaveAttribute(
      "aria-label",
      "Chọn món để thêm vào đơn",
    );
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

  // -------------------------------------------------------------------------
  // Controls: Gửi bếp always disabled; Thanh toán enabled for valid orders
  // -------------------------------------------------------------------------

  it("renders 'Gửi bếp' button as always disabled when currentOrder has items", () => {
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

    // "Gửi bếp" must remain disabled (feature not implemented yet)
    expect(screen.getByRole("button", { name: /Gửi bếp/i })).toBeDisabled();
    // "Thanh toán" is now enabled for a valid open order with items
    expect(screen.getByRole("button", { name: /Thanh toán/i })).not.toBeDisabled();
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

  // -------------------------------------------------------------------------
  // Thanh toán button eligibility
  // -------------------------------------------------------------------------

  it("Thanh toán button is disabled when currentOrder is null", () => {
    render(<OrderPanel selectedTable={null} />);
    expect(screen.getByRole("button", { name: /Thanh toán/i })).toBeDisabled();
  });

  it("Thanh toán button is disabled when currentOrder has no items (empty order)", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-empty",
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
    expect(screen.getByRole("button", { name: /Thanh toán/i })).toBeDisabled();
  });

  it("Thanh toán button is enabled for a valid open order with items", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-valid",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [
        {
          id: "line-1",
          orderId: "order-valid",
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
    expect(screen.getByRole("button", { name: /Thanh toán/i })).not.toBeDisabled();
  });

  it("clicking Thanh toán on a valid order opens an accessible dialog named 'Thanh toán'", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-valid",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [
        {
          id: "line-1",
          orderId: "order-valid",
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
    fireEvent.click(screen.getByRole("button", { name: /Thanh toán/i }));
    expect(
      screen.getByRole("dialog", { name: "Thanh toán" }),
    ).toBeInTheDocument();
  });

  it("dialog shows the exact stored order total when opened", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-valid",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [
        {
          id: "line-1",
          orderId: "order-valid",
          catalogItemId: "c1",
          name: "Trà sữa",
          price: 35_000,
          quantity: 2,
        },
      ],
      subtotal: 70_000,
      discount: 0,
      discountType: "amount",
      total: 70_000,
      createdAt: 1,
    });
    render(<OrderPanel selectedTable={table} />);
    fireEvent.click(screen.getByRole("button", { name: /Thanh toán/i }));
    const dialog = screen.getByRole("dialog", { name: "Thanh toán" });
    expect(dialog).toBeInTheDocument();
    // 70 000 VND → "70.000 ₫" — scoped to the dialog to avoid ambiguity with panel totals
    expect(within(dialog).getByText(/70\.000/)).toBeInTheDocument();
  });

  it("clicking Thanh toán does NOT open a dialog when currentOrder is null", () => {
    render(<OrderPanel selectedTable={null} />);
    // Button is disabled; no dialog should appear.
    const btn = screen.getByRole("button", { name: /Thanh toán/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Tăng số lượng – increment quantity via plus button
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Giảm số lượng – decrement quantity via minus button
  // -------------------------------------------------------------------------

  it("clicking 'Giảm số lượng' for qty 3 decrements to 2 and updates store subtotal and total to 50,000", () => {
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
          quantity: 3,
        },
      ],
      subtotal: 75_000,
      discount: 0,
      discountType: "amount",
      total: 75_000,
      createdAt: 1,
    });

    render(<OrderPanel selectedTable={table} />);

    // Scope click to the specific item row
    const itemRow = screen.getByText("Cà phê đen").closest("li") as HTMLElement;
    const minusBtn = within(itemRow).getByRole("button", { name: "Giảm số lượng Cà phê đen" });

    expect(minusBtn).not.toBeDisabled();
    fireEvent.click(minusBtn);

    // UI must reflect qty 2, line must still be present
    expect(within(itemRow).getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Cà phê đen")).toBeInTheDocument();

    // Store subtotal and total must be 50,000
    const { currentOrder } = useOrderPaymentStore.getState();
    expect(currentOrder?.subtotal).toBe(50_000);
    expect(currentOrder?.total).toBe(50_000);

    // UI totals must also show 50,000
    const totalMatches = screen.getAllByText(/50\.000/);
    expect(totalMatches.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Giảm số lượng at qty 1 – removes item entirely (removeItem)
  // -------------------------------------------------------------------------

  it("clicking 'Giảm số lượng' at qty 1 removes the item and shows empty state with subtitle '0 món', subtotal/total 0, Thanh toán disabled", () => {
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

    const itemRow = screen.getByText("Cà phê đen").closest("li") as HTMLElement;
    const minusBtn = within(itemRow).getByRole("button", { name: "Giảm số lượng Cà phê đen" });

    // Minus must be ENABLED at qty 1 (not disabled)
    expect(minusBtn).not.toBeDisabled();

    fireEvent.click(minusBtn);

    // Item is gone – empty state shown
    expect(screen.getByText("Chọn món để thêm vào đơn")).toBeInTheDocument();
    expect(screen.queryByText("Cà phê đen")).not.toBeInTheDocument();

    // Subtitle shows "0 món"
    expect(screen.getByText("0 món")).toBeInTheDocument();

    // Store items array is empty, subtotal and total are 0
    const { currentOrder } = useOrderPaymentStore.getState();
    expect(currentOrder?.items).toEqual([]);
    expect(currentOrder?.subtotal).toBe(0);
    expect(currentOrder?.total).toBe(0);

    // Thanh toán button is disabled
    expect(screen.getByRole("button", { name: /Thanh toán/i })).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Xóa món – trash button removes a single item row
  // -------------------------------------------------------------------------

  it("clicking 'Xóa món' on Trà chanh row removes only that item, coffee qty 2 remains, subtotal/total 50,000, Thanh toán enabled", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-trash-1",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [
        {
          id: "line-coffee",
          orderId: "order-trash-1",
          catalogItemId: "c1",
          name: "Cà phê đen",
          price: 25_000,
          quantity: 2,
        },
        {
          id: "line-tea",
          orderId: "order-trash-1",
          catalogItemId: "c2",
          name: "Trà chanh",
          price: 20_000,
          quantity: 1,
        },
      ],
      subtotal: 70_000,
      discount: 0,
      discountType: "amount",
      total: 70_000,
      createdAt: 1,
    });

    render(<OrderPanel selectedTable={table} />);

    // Scope the trash click to Trà chanh row only
    const teaRow = screen.getByText("Trà chanh").closest("li") as HTMLElement;
    const trashBtn = within(teaRow).getByRole("button", { name: "Xóa Trà chanh khỏi đơn" });

    expect(trashBtn).not.toBeDisabled();
    fireEvent.click(trashBtn);

    // Trà chanh is gone; Cà phê đen row remains with qty 2
    expect(screen.queryByText("Trà chanh")).not.toBeInTheDocument();
    expect(screen.getByText("Cà phê đen")).toBeInTheDocument();

    const coffeeRow = screen.getByText("Cà phê đen").closest("li") as HTMLElement;
    expect(within(coffeeRow).getByText("2")).toBeInTheDocument();

    // Store: 1 item remaining, subtotal and total 50,000
    const { currentOrder } = useOrderPaymentStore.getState();
    expect(currentOrder?.items).toHaveLength(1);
    expect(currentOrder?.items[0].name).toBe("Cà phê đen");
    expect(currentOrder?.subtotal).toBe(50_000);
    expect(currentOrder?.total).toBe(50_000);

    // UI totals show 50,000
    const totalMatches = screen.getAllByText(/50\.000/);
    expect(totalMatches.length).toBeGreaterThan(0);

    // Thanh toán enabled (order still has items)
    expect(screen.getByRole("button", { name: /Thanh toán/i })).not.toBeDisabled();
  });

  it("clicking 'Xóa món' on the last item (Cà phê đen qty 2) shows empty state, subtitle '0 món', totals 0, Thanh toán disabled", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-trash-2",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [
        {
          id: "line-coffee",
          orderId: "order-trash-2",
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

    const coffeeRow = screen.getByText("Cà phê đen").closest("li") as HTMLElement;
    const trashBtn = within(coffeeRow).getByRole("button", { name: "Xóa Cà phê đen khỏi đơn" });

    expect(trashBtn).not.toBeDisabled();
    fireEvent.click(trashBtn);

    // Empty state shown
    expect(screen.getByText("Chọn món để thêm vào đơn")).toBeInTheDocument();
    expect(screen.queryByText("Cà phê đen")).not.toBeInTheDocument();

    // Subtitle shows "0 món"
    expect(screen.getByText("0 món")).toBeInTheDocument();

    // Store: empty items, totals 0
    const { currentOrder } = useOrderPaymentStore.getState();
    expect(currentOrder?.items).toEqual([]);
    expect(currentOrder?.subtotal).toBe(0);
    expect(currentOrder?.total).toBe(0);

    // Thanh toán disabled
    expect(screen.getByRole("button", { name: /Thanh toán/i })).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Accessible list semantics and contextual labels (Issue #2 microtask 1)
  // -------------------------------------------------------------------------

  it("renders open-order items as a semantic list with listitem roles", () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-a11y-1",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [
        {
          id: "line-coffee",
          orderId: "order-a11y-1",
          catalogItemId: "c1",
          name: "Cà phê đen",
          price: 25_000,
          quantity: 2,
        },
        {
          id: "line-tea",
          orderId: "order-a11y-1",
          catalogItemId: "c2",
          name: "Trà chanh",
          price: 20_000,
          quantity: 1,
        },
      ],
      subtotal: 70_000,
      discount: 0,
      discountType: "amount",
      total: 70_000,
      createdAt: 1,
    });

    render(<OrderPanel selectedTable={table} />);

    // Semantic list must be present
    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();

    // Each item must be a listitem inside that list
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    // Contextual button labels for Cà phê đen row (tied to item.id, not index)
    const coffeeRow = items.find((li) => within(li).queryByText("Cà phê đen") !== null)!;
    expect(within(coffeeRow).getByRole("button", { name: "Giảm số lượng Cà phê đen" })).toBeInTheDocument();
    expect(within(coffeeRow).getByRole("button", { name: "Tăng số lượng Cà phê đen" })).toBeInTheDocument();
    expect(within(coffeeRow).getByRole("button", { name: "Xóa Cà phê đen khỏi đơn" })).toBeInTheDocument();

    // Contextual button labels for Trà chanh row
    const teaRow = items.find((li) => within(li).queryByText("Trà chanh") !== null)!;
    expect(within(teaRow).getByRole("button", { name: "Giảm số lượng Trà chanh" })).toBeInTheDocument();
    expect(within(teaRow).getByRole("button", { name: "Tăng số lượng Trà chanh" })).toBeInTheDocument();
    expect(within(teaRow).getByRole("button", { name: "Xóa Trà chanh khỏi đơn" })).toBeInTheDocument();

    // Accessible quantity for Cà phê đen
    expect(within(coffeeRow).getByText("Số lượng Cà phê đen: 2")).toBeInTheDocument();
  });

  it("clicking 'Tăng số lượng' for an item increments its quantity and updates store subtotal and total to 75,000", () => {
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

    // Find the item row then scope the button query to that row
    const itemRow = screen.getByText("Cà phê đen").closest("li") as HTMLElement;
    const plusBtn = within(itemRow).getByRole("button", { name: "Tăng số lượng Cà phê đen" });

    expect(plusBtn).not.toBeDisabled();
    fireEvent.click(plusBtn);

    // UI must reflect qty 3
    expect(within(itemRow).getByText("3")).toBeInTheDocument();

    // Store subtotal and total must be 75,000 (recomputed by the store, not the UI)
    const { currentOrder } = useOrderPaymentStore.getState();
    expect(currentOrder?.subtotal).toBe(75_000);
    expect(currentOrder?.total).toBe(75_000);

    // UI totals must also show 75,000
    const totalMatches = screen.getAllByText(/75\.000/);
    expect(totalMatches.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Live region announcements (Issue #2 microtask 2)
  // -------------------------------------------------------------------------

  describe("live region announcements", () => {
    it("always mounts exactly one live region with role=status, aria-live=polite, aria-atomic=true", () => {
      render(<OrderPanel selectedTable={null} />);
      const regions = screen.getAllByRole("status");
      expect(regions).toHaveLength(1);
      expect(regions[0]).toHaveAttribute("aria-live", "polite");
      expect(regions[0]).toHaveAttribute("aria-atomic", "true");
    });

    it("live region is present even when currentOrder has items", () => {
      useOrderPaymentStore.getState().selectOpenOrder({
        id: "order-lr-1",
        tenantId: "tenant-1",
        tableId: "table-1",
        staffId: "staff-1",
        status: "open",
        items: [
          {
            id: "line-1",
            orderId: "order-lr-1",
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
      expect(screen.getAllByRole("status")).toHaveLength(1);
    });

    it("announces 'Cà phê đen, số lượng 3' after clicking plus on qty 2 item", () => {
      useOrderPaymentStore.getState().selectOpenOrder({
        id: "order-lr-plus",
        tenantId: "tenant-1",
        tableId: "table-1",
        staffId: "staff-1",
        status: "open",
        items: [
          {
            id: "line-1",
            orderId: "order-lr-plus",
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

      const itemRow = screen.getByText("Cà phê đen").closest("li") as HTMLElement;
      const plusBtn = within(itemRow).getByRole("button", { name: "Tăng số lượng Cà phê đen" });
      fireEvent.click(plusBtn);

      expect(screen.getByRole("status")).toHaveTextContent("Cà phê đen, số lượng 3");
    });

    it("announces 'Cà phê đen, số lượng 2' after clicking minus on qty 3 item (non-delete)", () => {
      useOrderPaymentStore.getState().selectOpenOrder({
        id: "order-lr-minus",
        tenantId: "tenant-1",
        tableId: "table-1",
        staffId: "staff-1",
        status: "open",
        items: [
          {
            id: "line-1",
            orderId: "order-lr-minus",
            catalogItemId: "c1",
            name: "Cà phê đen",
            price: 25_000,
            quantity: 3,
          },
        ],
        subtotal: 75_000,
        discount: 0,
        discountType: "amount",
        total: 75_000,
        createdAt: 1,
      });
      render(<OrderPanel selectedTable={table} />);

      const itemRow = screen.getByText("Cà phê đen").closest("li") as HTMLElement;
      const minusBtn = within(itemRow).getByRole("button", { name: "Giảm số lượng Cà phê đen" });
      fireEvent.click(minusBtn);

      expect(screen.getByRole("status")).toHaveTextContent("Cà phê đen, số lượng 2");
    });

    it("announces delete message with remaining count when trash removes a non-last item", () => {
      useOrderPaymentStore.getState().selectOpenOrder({
        id: "order-lr-trash-1",
        tenantId: "tenant-1",
        tableId: "table-1",
        staffId: "staff-1",
        status: "open",
        items: [
          {
            id: "line-coffee",
            orderId: "order-lr-trash-1",
            catalogItemId: "c1",
            name: "Cà phê đen",
            price: 25_000,
            quantity: 2,
          },
          {
            id: "line-tea",
            orderId: "order-lr-trash-1",
            catalogItemId: "c2",
            name: "Trà chanh",
            price: 20_000,
            quantity: 1,
          },
        ],
        subtotal: 70_000,
        discount: 0,
        discountType: "amount",
        total: 70_000,
        createdAt: 1,
      });
      render(<OrderPanel selectedTable={table} />);

      const teaRow = screen.getByText("Trà chanh").closest("li") as HTMLElement;
      const trashBtn = within(teaRow).getByRole("button", { name: "Xóa Trà chanh khỏi đơn" });
      fireEvent.click(trashBtn);

      expect(screen.getByRole("status")).toHaveTextContent(
        "Đã xóa Trà chanh khỏi đơn. Còn 1 món.",
      );
    });

    it("announces delete message with empty-order text when minus at qty 1 removes the last item", () => {
      useOrderPaymentStore.getState().selectOpenOrder({
        id: "order-lr-minus-last",
        tenantId: "tenant-1",
        tableId: "table-1",
        staffId: "staff-1",
        status: "open",
        items: [
          {
            id: "line-1",
            orderId: "order-lr-minus-last",
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

      const itemRow = screen.getByText("Cà phê đen").closest("li") as HTMLElement;
      const minusBtn = within(itemRow).getByRole("button", { name: "Giảm số lượng Cà phê đen" });
      fireEvent.click(minusBtn);

      expect(screen.getByRole("status")).toHaveTextContent(
        "Đã xóa Cà phê đen khỏi đơn. Đơn hàng trống.",
      );
    });

    it("announces delete message with empty-order text when trash removes the last item", () => {
      useOrderPaymentStore.getState().selectOpenOrder({
        id: "order-lr-trash-last",
        tenantId: "tenant-1",
        tableId: "table-1",
        staffId: "staff-1",
        status: "open",
        items: [
          {
            id: "line-1",
            orderId: "order-lr-trash-last",
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

      const coffeeRow = screen.getByText("Cà phê đen").closest("li") as HTMLElement;
      const trashBtn = within(coffeeRow).getByRole("button", { name: "Xóa Cà phê đen khỏi đơn" });
      fireEvent.click(trashBtn);

      expect(screen.getByRole("status")).toHaveTextContent(
        "Đã xóa Cà phê đen khỏi đơn. Đơn hàng trống.",
      );
    });
  });

  // -------------------------------------------------------------------------
  // Focus recovery after line removal (Issue #2 microtask 3)
  // -------------------------------------------------------------------------

  describe("focus recovery after line removal", () => {
    const threeItemOrder = () =>
      useOrderPaymentStore.getState().selectOpenOrder({
        id: "order-focus-3",
        tenantId: "tenant-1",
        tableId: "table-1",
        staffId: "staff-1",
        status: "open",
        items: [
          {
            id: "line-a",
            orderId: "order-focus-3",
            catalogItemId: "c1",
            name: "Món A",
            price: 10_000,
            quantity: 2,
          },
          {
            id: "line-b",
            orderId: "order-focus-3",
            catalogItemId: "c2",
            name: "Món B",
            price: 10_000,
            quantity: 2,
          },
          {
            id: "line-c",
            orderId: "order-focus-3",
            catalogItemId: "c3",
            name: "Món C",
            price: 10_000,
            quantity: 2,
          },
        ],
        subtotal: 60_000,
        discount: 0,
        discountType: "amount",
        total: 60_000,
        createdAt: 1,
      });

    it("deleting the first of three items moves focus to trash of the next remaining item (Món B)", async () => {
      threeItemOrder();
      render(<OrderPanel selectedTable={table} />);

      const rowA = screen.getByText("Món A").closest("li") as HTMLElement;
      const trashA = within(rowA).getByRole("button", { name: "Xóa Món A khỏi đơn" });
      fireEvent.click(trashA);

      await waitFor(() => {
        const rowB = screen.getByText("Món B").closest("li") as HTMLElement;
        const trashB = within(rowB).getByRole("button", { name: "Xóa Món B khỏi đơn" });
        expect(document.activeElement).toBe(trashB);
      });
    });

    it("deleting the last of three items moves focus to trash of the previous remaining item (Món B)", async () => {
      threeItemOrder();
      render(<OrderPanel selectedTable={table} />);

      const rowC = screen.getByText("Món C").closest("li") as HTMLElement;
      const trashC = within(rowC).getByRole("button", { name: "Xóa Món C khỏi đơn" });
      fireEvent.click(trashC);

      await waitFor(() => {
        const rowB = screen.getByText("Món B").closest("li") as HTMLElement;
        const trashB = within(rowB).getByRole("button", { name: "Xóa Món B khỏi đơn" });
        expect(document.activeElement).toBe(trashB);
      });
    });

    it("deleting the middle of three items prefers focus on the next remaining item (Món C)", async () => {
      threeItemOrder();
      render(<OrderPanel selectedTable={table} />);

      const rowB = screen.getByText("Món B").closest("li") as HTMLElement;
      const trashB = within(rowB).getByRole("button", { name: "Xóa Món B khỏi đơn" });
      fireEvent.click(trashB);

      await waitFor(() => {
        const rowC = screen.getByText("Món C").closest("li") as HTMLElement;
        const trashC = within(rowC).getByRole("button", { name: "Xóa Món C khỏi đơn" });
        expect(document.activeElement).toBe(trashC);
      });
    });

    it("qty-1 minus (which removes the first item) moves focus to trash of the next remaining item (Món B)", async () => {
      useOrderPaymentStore.getState().selectOpenOrder({
        id: "order-focus-minus-3",
        tenantId: "tenant-1",
        tableId: "table-1",
        staffId: "staff-1",
        status: "open",
        items: [
          {
            id: "line-a",
            orderId: "order-focus-minus-3",
            catalogItemId: "c1",
            name: "Món A",
            price: 10_000,
            quantity: 1,
          },
          {
            id: "line-b",
            orderId: "order-focus-minus-3",
            catalogItemId: "c2",
            name: "Món B",
            price: 10_000,
            quantity: 2,
          },
          {
            id: "line-c",
            orderId: "order-focus-minus-3",
            catalogItemId: "c3",
            name: "Món C",
            price: 10_000,
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

      const rowA = screen.getByText("Món A").closest("li") as HTMLElement;
      const minusA = within(rowA).getByRole("button", { name: "Giảm số lượng Món A" });
      fireEvent.click(minusA);

      await waitFor(() => {
        const rowB = screen.getByText("Món B").closest("li") as HTMLElement;
        const trashB = within(rowB).getByRole("button", { name: "Xóa Món B khỏi đơn" });
        expect(document.activeElement).toBe(trashB);
      });
    });

    it("deleting the only remaining line moves focus to the empty-state element", async () => {
      useOrderPaymentStore.getState().selectOpenOrder({
        id: "order-focus-only",
        tenantId: "tenant-1",
        tableId: "table-1",
        staffId: "staff-1",
        status: "open",
        items: [
          {
            id: "line-only",
            orderId: "order-focus-only",
            catalogItemId: "c1",
            name: "Món Duy Nhất",
            price: 10_000,
            quantity: 2,
          },
        ],
        subtotal: 20_000,
        discount: 0,
        discountType: "amount",
        total: 20_000,
        createdAt: 1,
      });
      render(<OrderPanel selectedTable={table} />);

      const row = screen.getByText("Món Duy Nhất").closest("li") as HTMLElement;
      const trash = within(row).getByRole("button", { name: "Xóa Món Duy Nhất khỏi đơn" });
      fireEvent.click(trash);

      await waitFor(() => {
        const emptyState = screen.getByTestId("order-empty-state");
        expect(document.activeElement).toBe(emptyState);
      });
    });

    it("clicking plus (qty > 1 stays) does not move focus away from the plus button", async () => {
      useOrderPaymentStore.getState().selectOpenOrder({
        id: "order-focus-plus",
        tenantId: "tenant-1",
        tableId: "table-1",
        staffId: "staff-1",
        status: "open",
        items: [
          {
            id: "line-1",
            orderId: "order-focus-plus",
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

      const itemRow = screen.getByText("Cà phê đen").closest("li") as HTMLElement;
      const plusBtn = within(itemRow).getByRole("button", { name: "Tăng số lượng Cà phê đen" });
      plusBtn.focus();
      fireEvent.click(plusBtn);

      // After a brief tick, focus must still be on plus (or at minimum NOT on empty state / another trash)
      await waitFor(() => {
        expect(document.activeElement).toBe(plusBtn);
      });
    });

    it("clicking minus at qty > 1 (no delete) does not move focus away from the minus button", async () => {
      useOrderPaymentStore.getState().selectOpenOrder({
        id: "order-focus-minus-nodelete",
        tenantId: "tenant-1",
        tableId: "table-1",
        staffId: "staff-1",
        status: "open",
        items: [
          {
            id: "line-1",
            orderId: "order-focus-minus-nodelete",
            catalogItemId: "c1",
            name: "Cà phê đen",
            price: 25_000,
            quantity: 3,
          },
        ],
        subtotal: 75_000,
        discount: 0,
        discountType: "amount",
        total: 75_000,
        createdAt: 1,
      });
      render(<OrderPanel selectedTable={table} />);

      const itemRow = screen.getByText("Cà phê đen").closest("li") as HTMLElement;
      const minusBtn = within(itemRow).getByRole("button", { name: "Giảm số lượng Cà phê đen" });
      minusBtn.focus();
      fireEvent.click(minusBtn);

      await waitFor(() => {
        expect(document.activeElement).toBe(minusBtn);
      });
    });
  });
});
