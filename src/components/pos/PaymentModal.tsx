import React, { useState } from "react";
import type { PaymentMethod } from "../../../packages/pos-core/src/types";
import { formatCurrency } from "@/lib/pos";
import { useOrderPaymentStore } from "@/stores/order-payment-store";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
  { value: "card", label: "Thẻ" },
  { value: "other", label: "Khác" },
];

export interface PaymentModalProps {
  open: boolean;
  /** Store-provided integer VND total. Never recomputed here. */
  orderTotal: number;
  onOpenChange: (open: false) => void;
  /** Omit identity props for Task 2.9 read-only preview. */
  orderId?: string;
  tenantId?: string;
  staffId?: string;
  /**
   * Optional pre-validation hook called synchronously before `recordPayment`.
   * If it returns `false` the confirm action is aborted with no state change.
   * Use this to validate cross-store preconditions (e.g. table is releasable)
   * without mutating either store.
   */
  onBeforeConfirm?: () => boolean;
  /** Return false to keep modal open and suppress success UI. */
  onPaymentSuccess?: () => boolean | void;
}

const parseTender = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const tender = Number(value);
  return Number.isSafeInteger(tender) ? tender : null;
};

export function PaymentModal({ open, orderTotal, onOpenChange, orderId, tenantId, staffId, onBeforeConfirm, onPaymentSuccess }: PaymentModalProps) {
  const recordPayment = useOrderPaymentStore((state) => state.recordPayment);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [tenderInput, setTenderInput] = useState("");
  const [success, setSuccess] = useState(false);
  const tender = parseTender(tenderInput);
  const executable = Boolean(orderId && tenantId && staffId);
  const validTender = tender !== null && (selectedMethod === "cash" ? tender >= orderTotal : tender === orderTotal);
  const change = selectedMethod === "cash" && tender !== null && tender >= orderTotal ? tender - orderTotal : null;

  if (!open) return null;

  const confirm = () => {
    if (!executable || !validTender || tender === null || !orderId || !tenantId || !staffId) return;
    // Pre-validate cross-store preconditions (e.g. table releasable) before mutating payment store.
    if (onBeforeConfirm && !onBeforeConfirm()) return;
    const createdAt = Date.now();
    const id = globalThis.crypto?.randomUUID?.() ?? `${createdAt}-${Math.random()}`;
    if (!recordPayment({ id, tenantId, orderId, amount: orderTotal, tender, method: selectedMethod, staffId, createdAt })) return;
    if (onPaymentSuccess?.() === false) return;
    setSuccess(true);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div role="dialog" aria-modal="true" aria-label="Thanh toán" className="relative w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-foreground">Thanh toán</h2>
        {success ? (
          <p role="status" className="rounded-xl bg-primary/10 p-4 font-semibold text-primary">Thanh toán thành công</p>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-muted/40 p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Tổng cộng</span><span className="text-xl font-bold text-primary">{formatCurrency(orderTotal)}</span></div></div>
            <div className="mt-4"><p className="mb-2 text-sm font-medium text-foreground">Phương thức thanh toán</p><div className="grid grid-cols-2 gap-2">{PAYMENT_METHODS.map(({ value, label }) => <button key={value} aria-pressed={selectedMethod === value} onClick={() => setSelectedMethod(value)} className={["rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors", selectedMethod === value ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-foreground hover:bg-muted"].join(" ")}>{label}</button>)}</div></div>
            {executable && <div className="mt-4"><label htmlFor="payment-tender" className="mb-2 block text-sm font-medium text-foreground">Số tiền khách đưa</label><input id="payment-tender" type="number" inputMode="numeric" min="0" step="1" value={tenderInput} onChange={(event) => setTenderInput(event.target.value)} className="w-full rounded-lg border border-input bg-background p-2.5" />{change !== null && <p className="mt-2 text-sm text-muted-foreground">Tiền thối: {formatCurrency(change)}</p>}</div>}
            <div className="mt-5 grid grid-cols-2 gap-2">{executable && <button disabled={!validTender} onClick={confirm} className="rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">Xác nhận thanh toán</button>}<button aria-label="Hủy" onClick={() => onOpenChange(false)} className="rounded-lg border border-input bg-background py-2.5 text-sm font-semibold text-foreground hover:bg-muted">Hủy</button></div>
          </>
        )}
      </div>
    </div>
  );
}
