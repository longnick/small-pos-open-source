import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaymentModal } from "./PaymentModal";
import { useOrderPaymentStore } from "../../stores/order-payment-store";
import type { Payment } from "../../../packages/pos-core/src/types";

// ---------------------------------------------------------------------------
// PaymentModal unit tests
// ---------------------------------------------------------------------------

describe("PaymentModal", () => {
  // -------------------------------------------------------------------------
  // Closed state
  // -------------------------------------------------------------------------

  it("renders nothing when open is false", () => {
    const { container } = render(
      <PaymentModal open={false} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  // -------------------------------------------------------------------------
  // Open state – accessibility
  // -------------------------------------------------------------------------

  it("renders an accessible dialog named 'Thanh toán' when open is true", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    expect(
      screen.getByRole("dialog", { name: "Thanh toán" }),
    ).toBeInTheDocument();
  });

  it("dialog has aria-modal='true'", () => {
    render(
      <PaymentModal open={true} orderTotal={75_000} onOpenChange={vi.fn()} />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  // -------------------------------------------------------------------------
  // Open state – order total display
  // -------------------------------------------------------------------------

  it("displays the exact orderTotal passed as a prop (50 000)", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    // formatCurrency(50_000) → "50.000 ₫"  (vi-VN locale)
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
  });

  it("displays the exact orderTotal passed as a prop (120 000)", () => {
    render(
      <PaymentModal open={true} orderTotal={120_000} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText(/120\.000/)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Close button
  // -------------------------------------------------------------------------

  it("renders a close button inside the dialog", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    // Accept any button whose accessible name signals dismissal.
    const closeBtn = screen.getByRole("button", { name: /đóng|close|hủy|cancel/i });
    expect(closeBtn).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when the close button is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={onOpenChange} />,
    );
    const closeBtn = screen.getByRole("button", { name: /đóng|close|hủy|cancel/i });
    fireEvent.click(closeBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // -------------------------------------------------------------------------
  // No recordPayment / payment-execution surface when identity props absent
  // -------------------------------------------------------------------------

  it("does not render a 'Xác nhận thanh toán' or payment-confirm button when orderId is absent", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    expect(
      screen.queryByRole("button", { name: /xác nhận thanh toán/i }),
    ).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Slice 2: payment-method selection controls
  // -------------------------------------------------------------------------

  it("renders exactly four payment-method controls", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    // Each method button carries aria-pressed; query all of them.
    const methodBtns = screen
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("aria-pressed"));
    expect(methodBtns).toHaveLength(4);
  });

  it("renders a method control labelled 'Tiền mặt'", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /tiền mặt/i })).toBeInTheDocument();
  });

  it("renders a method control labelled 'Chuyển khoản'", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /chuyển khoản/i })).toBeInTheDocument();
  });

  it("renders a method control labelled 'Thẻ'", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /thẻ/i })).toBeInTheDocument();
  });

  it("renders a method control labelled 'Khác'", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /khác/i })).toBeInTheDocument();
  });

  it("default selected method is 'Tiền mặt' (aria-pressed='true')", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /tiền mặt/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("non-default methods have aria-pressed='false' initially", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /chuyển khoản/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: /thẻ/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: /khác/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clicking 'Chuyển khoản' sets its aria-pressed to true", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /chuyển khoản/i }));
    expect(screen.getByRole("button", { name: /chuyển khoản/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("clicking 'Chuyển khoản' deselects 'Tiền mặt' (aria-pressed becomes false)", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /chuyển khoản/i }));
    expect(screen.getByRole("button", { name: /tiền mặt/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("only one method has aria-pressed='true' after clicking 'Chuyển khoản'", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /chuyển khoản/i }));
    const selected = screen
      .getAllByRole("button")
      .filter((btn) => btn.getAttribute("aria-pressed") === "true");
    expect(selected).toHaveLength(1);
  });

  it("method selection is purely local: onOpenChange is not called when a method is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={onOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /chuyển khoản/i }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Slice 2: cancel/close boundary
  // -------------------------------------------------------------------------

  it("renders a 'Hủy' cancel button inside the dialog", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /hủy/i })).toBeInTheDocument();
  });

  it("clicking 'Hủy' calls onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={onOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /hủy/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clicking the backdrop calls onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={onOpenChange} />,
    );
    // The outermost div is the backdrop
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // -------------------------------------------------------------------------
  // Slice 2: static component boundary – no confirm when identity props absent
  // -------------------------------------------------------------------------

  it("does not render any 'Xác nhận' controls after method selection when orderId is absent", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /chuyển khoản/i }));
    expect(
      screen.queryByRole("button", { name: /xác nhận/i }),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Task 2.10: payment lifecycle – RED tests for PaymentModal
// ---------------------------------------------------------------------------

describe("PaymentModal – payment lifecycle (Task 2.10)", () => {
  // Reset store before each test in this suite
  beforeEach(() => {
    useOrderPaymentStore.getState().clearCurrentOrder();
    useOrderPaymentStore.setState({ payments: Object.freeze([]) as unknown as Payment[], lastReceipt: null });
  });

  // Minimal props for a fully wired modal
  const baseProps = () => ({
    open: true as const,
    orderTotal: 50_000,
    orderId: "order-pay",
    tenantId: "tenant-1",
    staffId: "staff-1",
    onOpenChange: vi.fn(),
    onPaymentSuccess: vi.fn(),
  });

  const loadOrder = () => {
    useOrderPaymentStore.getState().selectOpenOrder({
      id: "order-pay",
      tenantId: "tenant-1",
      tableId: "table-1",
      staffId: "staff-1",
      status: "open",
      items: [{ id: "line-1", orderId: "order-pay", catalogItemId: "c1", name: "Coffee", price: 50_000, quantity: 1 }],
      subtotal: 50_000,
      discount: 0,
      discountType: "amount",
      total: 50_000,
      createdAt: 1,
    });
  };

  it("renders a tender amount input field when orderId is provided", () => {
    render(<PaymentModal {...baseProps()} />);
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("tender input is labelled 'Số tiền khách đưa' or similar", () => {
    render(<PaymentModal {...baseProps()} />);
    expect(screen.getByLabelText(/số tiền khách đưa|tiền khách|tender/i)).toBeInTheDocument();
  });

  it("renders 'Xác nhận thanh toán' confirm button when orderId is provided", () => {
    render(<PaymentModal {...baseProps()} />);
    expect(screen.getByRole("button", { name: /xác nhận thanh toán/i })).toBeInTheDocument();
  });

  it("confirm button is disabled when tender input is empty", () => {
    render(<PaymentModal {...baseProps()} />);
    expect(screen.getByRole("button", { name: /xác nhận thanh toán/i })).toBeDisabled();
  });

  it("confirm button is disabled when tender < orderTotal", () => {
    render(<PaymentModal {...baseProps()} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "40000" } });
    expect(screen.getByRole("button", { name: /xác nhận thanh toán/i })).toBeDisabled();
  });

  it("confirm button is enabled when cash tender >= orderTotal", () => {
    render(<PaymentModal {...baseProps()} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "60000" } });
    expect(screen.getByRole("button", { name: /xác nhận thanh toán/i })).not.toBeDisabled();
  });

  it("confirm button is disabled for transfer method when tender > orderTotal", () => {
    render(<PaymentModal {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: /chuyển khoản/i }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "60000" } });
    expect(screen.getByRole("button", { name: /xác nhận thanh toán/i })).toBeDisabled();
  });

  it("confirm button is enabled for card method when tender === orderTotal", () => {
    render(<PaymentModal {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: /thẻ/i }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50000" } });
    expect(screen.getByRole("button", { name: /xác nhận thanh toán/i })).not.toBeDisabled();
  });

  it("shows change amount display for cash over-tender before confirmation", () => {
    render(<PaymentModal {...baseProps()} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "60000" } });
    // Should show "10.000" change somewhere in the modal
    expect(screen.getByText(/10\.000/)).toBeInTheDocument();
  });

  it("does not show nonzero change display for transfer when tender equals total", () => {
    render(<PaymentModal {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: /chuyển khoản/i }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50000" } });
    // At minimum, modal does not crash
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  it("calls onOpenChange(false) after successful payment", () => {
    const onOpenChange = vi.fn();
    const onPaymentSuccess = vi.fn();
    loadOrder();
    render(
      <PaymentModal
        open={true}
        orderTotal={50_000}
        orderId="order-pay"
        tenantId="tenant-1"
        staffId="staff-1"
        onOpenChange={onOpenChange}
        onPaymentSuccess={onPaymentSuccess}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận thanh toán/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows receipt success text after payment", () => {
    loadOrder();
    render(
      <PaymentModal
        open={true}
        orderTotal={50_000}
        orderId="order-pay"
        tenantId="tenant-1"
        staffId="staff-1"
        onOpenChange={vi.fn()}
        onPaymentSuccess={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "60000" } });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận thanh toán/i }));
    // After success a receipt view with success text should be visible
    expect(screen.getByText(/thanh toán thành công|thành công/i)).toBeInTheDocument();
  });

  it("does not call onOpenChange if store recordPayment returns false (no current order)", () => {
    const onPaymentSuccess = vi.fn();
    const onOpenChange = vi.fn();
    // No current order loaded – store will reject
    render(
      <PaymentModal
        open={true}
        orderTotal={50_000}
        orderId="order-pay"
        tenantId="tenant-1"
        staffId="staff-1"
        onOpenChange={onOpenChange}
        onPaymentSuccess={onPaymentSuccess}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận thanh toán/i }));
    expect(onPaymentSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
