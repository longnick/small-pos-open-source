import React, { useState } from "react";
import { formatCurrency } from "@/lib/pos";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentMethod = "cash" | "transfer" | "card" | "other";

interface MethodConfig {
  value: PaymentMethod;
  label: string;
}

const PAYMENT_METHODS: MethodConfig[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
  { value: "card", label: "Thẻ" },
  { value: "other", label: "Khác" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PaymentModalProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Order total (integer VND) read directly from the store – never recomputed here. */
  orderTotal: number;
  /** Called with `false` when the dialog should close. */
  onOpenChange: (open: false) => void;
}

// ---------------------------------------------------------------------------
// PaymentModal
// ---------------------------------------------------------------------------

/**
 * Read-only payment summary dialog with local payment-method selection.
 * Displays the order total and four method buttons (aria-pressed).
 * No payment execution, no store writes, no store imports.
 */
export function PaymentModal({ open, orderTotal, onOpenChange }: PaymentModalProps) {
  // Local selection state – never written to any store
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      {/* Dialog panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Thanh toán"
        className="relative w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="mb-4 text-lg font-bold text-foreground">Thanh toán</h2>

        {/* Order total – passed from store; never recomputed */}
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tổng cộng</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(orderTotal)}
            </span>
          </div>
        </div>

        {/* Payment-method selection – local state only, no store write */}
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-foreground">
            Phương thức thanh toán
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(({ value, label }) => (
              <button
                key={value}
                aria-pressed={selectedMethod === value}
                onClick={() => setSelectedMethod(value)}
                className={[
                  "rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors",
                  selectedMethod === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-foreground hover:bg-muted",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Cancel/close action – calls onOpenChange(false); no payment execution */}
        <div className="mt-5">
          <button
            aria-label="Hủy"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-lg border border-input bg-background py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
