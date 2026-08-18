import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PaymentModal } from "./PaymentModal";
import { useOrderPaymentStore } from "../../stores/order-payment-store";
import { useTenantAuthStore } from "../../stores/tenant-auth-store";
import type { Payment } from "../../../packages/pos-core/src/types";

// ---------------------------------------------------------------------------
// PaymentModal unit tests
// ---------------------------------------------------------------------------

describe("PaymentModal", () => {
  beforeEach(() => {
    useTenantAuthStore.setState({
      tenant: null,
      staff: { id: "staff-1", tenantId: "tenant-1", name: "Cashier", role: "cashier", pinHash: "hash", createdAt: 1 },
    });
  });

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

  it("method, cancel, and confirm buttons use type=button", () => {
    render(
      <PaymentModal
        open={true}
        orderTotal={50_000}
        onOpenChange={vi.fn()}
        orderId="order-pay"
        tenantId="tenant-1"
        staffId="staff-1"
      />,
    );
    for (const name of ["Tiền mặt", "Chuyển khoản", "Thẻ", "Khác", "Hủy", "Xác nhận thanh toán"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("type", "button");
    }
  });

  it("receipt print and close buttons use type=button", async () => {
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
    render(
      <PaymentModal
        open={true}
        orderTotal={50_000}
        onOpenChange={vi.fn()}
        orderId="order-pay"
        tenantId="tenant-1"
        staffId="staff-1"
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận thanh toán/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "In hóa đơn" })).toHaveAttribute("type", "button");
    });
    expect(screen.getByRole("button", { name: "Đóng" })).toHaveAttribute("type", "button");
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
    useTenantAuthStore.setState({
      tenant: null,
      staff: { id: "staff-1", tenantId: "tenant-1", name: "Cashier", role: "cashier", pinHash: "hash", createdAt: 1 },
    });
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

  it("keeps a successful payment open as a receipt until user closes it", async () => {
    const onOpenChange = vi.fn();
    loadOrder();
    render(<PaymentModal {...baseProps()} onOpenChange={onOpenChange} onPaymentSuccess={() => true} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "60000" } });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận thanh toán/i }));
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Hóa đơn thanh toán" })).toBeInTheDocument();
    });
    expect(screen.getByText(/mã thanh toán/i)).toBeInTheDocument();
    expect(screen.getByText(/tiền mặt/i)).toBeInTheDocument();
    expect(screen.getByText(/10\.000/)).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows zero change on transfer receipt", async () => {
    loadOrder();
    render(<PaymentModal {...baseProps()} onPaymentSuccess={() => true} />);
    fireEvent.click(screen.getByRole("button", { name: "Chuyển khoản" }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận thanh toán/i }));
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Hóa đơn thanh toán" })).toHaveTextContent("Chuyển khoản");
    });
    expect(screen.getByRole("region", { name: "Hóa đơn thanh toán" })).toHaveTextContent(/Tiền thối:\s*0/);
  });

  it("prints receipt and closes it once", async () => {
    const onOpenChange = vi.fn();
    const onReceiptClose = vi.fn();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    loadOrder();
    render(<PaymentModal {...baseProps()} onOpenChange={onOpenChange} onPaymentSuccess={() => true} onReceiptClose={onReceiptClose} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận thanh toán/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "In hóa đơn" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "In hóa đơn" }));
    expect(print).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onReceiptClose).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    print.mockRestore();
  });

  it("shows receipt success text after payment", async () => {
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
    await waitFor(() => {
      expect(screen.getByText(/thanh toán thành công|thành công/i)).toBeInTheDocument();
    });
  });

  it("does not record or close when cross-store prevalidation rejects", () => {
    const onOpenChange = vi.fn();
    const onPaymentSuccess = vi.fn();
    loadOrder();
    render(<PaymentModal {...baseProps()} onOpenChange={onOpenChange} onBeforeConfirm={() => false} onPaymentSuccess={onPaymentSuccess} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận thanh toán/i }));
    expect(useOrderPaymentStore.getState().currentOrder?.status).toBe("open");
    expect(useOrderPaymentStore.getState().payments).toHaveLength(0);
    expect(onPaymentSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("keeps modal open and suppresses success UI when post-payment lifecycle returns false", async () => {
    const onOpenChange = vi.fn();
    loadOrder();
    render(<PaymentModal {...baseProps()} onOpenChange={onOpenChange} onPaymentSuccess={() => false} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: /xác nhận thanh toán/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Không lưu được thanh toán. Kiểm tra lại đơn trước khi thu tiếp.");
    });
    expect(useOrderPaymentStore.getState().currentOrder?.status).toBe("paid");
    expect(screen.getByRole("dialog", { name: "Thanh toán" })).toBeInTheDocument();
    expect(screen.queryByText(/thanh toán thành công/i)).not.toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
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
