import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaymentModal } from "./PaymentModal";

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
  // No recordPayment / payment-execution surface
  // -------------------------------------------------------------------------

  it("does not render a 'Xác nhận thanh toán' or payment-confirm button", () => {
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
  // Slice 2: static component boundary – no confirm/payment-exec surface
  // -------------------------------------------------------------------------

  it("does not render any 'Xác nhận' or payment-confirm controls after method selection", () => {
    render(
      <PaymentModal open={true} orderTotal={50_000} onOpenChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /chuyển khoản/i }));
    expect(
      screen.queryByRole("button", { name: /xác nhận/i }),
    ).not.toBeInTheDocument();
  });
});
