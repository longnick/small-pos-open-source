import React, { useRef, useState } from "react";
import type { PaymentMethod } from "../../../packages/pos-core/src/types";
import { formatCurrency } from "@/lib/pos";
import { useOrderPaymentStore } from "@/stores/order-payment-store";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
  { value: "card", label: "Thẻ" },
  { value: "other", label: "Khác" },
];
const methodLabel = (method: PaymentMethod) => PAYMENT_METHODS.find((entry) => entry.value === method)?.label ?? method;

type Receipt = { id: string; method: PaymentMethod; total: number; tender: number; change: number; timestamp: number };

export interface PaymentModalProps {
  open: boolean;
  orderTotal: number;
  onOpenChange: (open: false) => void;
  orderId?: string;
  tenantId?: string;
  staffId?: string;
  onBeforeConfirm?: () => boolean;
  /** Return false when table release or persist fails; receipt must not be shown. */
  onPaymentSuccess?: () => boolean | void | Promise<boolean | void>;
  /** Called once only when user closes a confirmed receipt. */
  onReceiptClose?: () => void;
}

const parseTender = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const tender = Number(value);
  return Number.isSafeInteger(tender) ? tender : null;
};

export function PaymentModal({ open, orderTotal, onOpenChange, orderId, tenantId, staffId, onBeforeConfirm, onPaymentSuccess, onReceiptClose }: PaymentModalProps) {
  const recordPayment = useOrderPaymentStore((state) => state.recordPayment);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [tenderInput, setTenderInput] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);
  const receiptClosed = useRef(false);
  const tender = parseTender(tenderInput);
  const executable = Boolean(orderId && tenantId && staffId);
  const validTender = tender !== null && (selectedMethod === "cash" ? tender >= orderTotal : tender === orderTotal);
  const change = selectedMethod === "cash" && tender !== null && tender >= orderTotal ? tender - orderTotal : null;

  if (!open) return null;

  const confirm = async () => {
    if (paying || !executable || !validTender || tender === null || !orderId || !tenantId || !staffId) return;
    if (onBeforeConfirm && !onBeforeConfirm()) return;
    const timestamp = Date.now();
    const id = globalThis.crypto?.randomUUID?.() ?? `${timestamp}-${Math.random()}`;
    if (!recordPayment({ id, tenantId, orderId, amount: orderTotal, tender, method: selectedMethod, staffId, createdAt: timestamp })) return;
    setPaying(true);
    setPayError("");
    try {
      const lifecycle = await Promise.resolve(onPaymentSuccess?.());
      if (lifecycle === false) {
        setPayError("Không lưu được thanh toán. Kiểm tra lại đơn trước khi thu tiếp.");
        return;
      }
      setReceipt({ id, method: selectedMethod, total: orderTotal, tender, change: selectedMethod === "cash" ? tender - orderTotal : 0, timestamp });
    } catch {
      setPayError("Không lưu được thanh toán. Kiểm tra lại đơn trước khi thu tiếp.");
    } finally {
      setPaying(false);
    }
  };

  const closeReceipt = () => {
    if (!receipt || receiptClosed.current) return;
    receiptClosed.current = true;
    onReceiptClose?.();
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !receipt && !paying && onOpenChange(false)}>
      <div role="dialog" aria-modal="true" aria-label="Thanh toán" className="relative w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-foreground">{receipt ? "Hóa đơn" : "Thanh toán"}</h2>
        {receipt ? (
          <section aria-label="Hóa đơn thanh toán" className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <p role="status" className="font-semibold text-primary">Thanh toán thành công</p>
            <p>Mã thanh toán: <strong>{receipt.id}</strong></p>
            <p>Phương thức: <strong>{methodLabel(receipt.method)}</strong></p>
            <p>Tổng thanh toán: <strong>{formatCurrency(receipt.total)}</strong></p>
            <p>Khách đưa: <strong>{formatCurrency(receipt.tender)}</strong></p>
            <p>Tiền thối: <strong>{formatCurrency(receipt.change)}</strong></p>
            <p>Thời điểm: <time dateTime={new Date(receipt.timestamp).toISOString()}>{new Date(receipt.timestamp).toLocaleString("vi-VN")}</time></p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={() => window.print()} className="rounded-lg border border-input bg-background py-2.5 font-semibold">In hóa đơn</button>
              <button type="button" onClick={closeReceipt} className="rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground">Đóng</button>
            </div>
          </section>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-muted/40 p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Tổng cộng</span><span className="text-xl font-bold text-primary">{formatCurrency(orderTotal)}</span></div></div>
            <div className="mt-4"><p className="mb-2 text-sm font-medium text-foreground">Phương thức thanh toán</p><div className="grid grid-cols-2 gap-2">{PAYMENT_METHODS.map(({ value, label }) => <button key={value} type="button" aria-pressed={selectedMethod === value} onClick={() => setSelectedMethod(value)} className={["rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors", selectedMethod === value ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-foreground hover:bg-muted"].join(" ")}>{label}</button>)}</div></div>
            {executable && <div className="mt-4"><label htmlFor="payment-tender" className="mb-2 block text-sm font-medium text-foreground">Số tiền khách đưa</label><input id="payment-tender" type="number" inputMode="numeric" min="0" step="1" value={tenderInput} onChange={(event) => setTenderInput(event.target.value)} className="w-full rounded-lg border border-input bg-background p-2.5" />{change !== null && <p className="mt-2 text-sm text-muted-foreground">Tiền thối: {formatCurrency(change)}</p>}</div>}
            <div className="mt-5 grid grid-cols-2 gap-2">{executable && <button type="button" disabled={!validTender || paying} onClick={() => { void confirm(); }} className="rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">Xác nhận thanh toán</button>}<button type="button" aria-label="Hủy" disabled={paying} onClick={() => !paying && onOpenChange(false)} className="rounded-lg border border-input bg-background py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-40">Hủy</button></div>
            {payError && <p role="alert" className="mt-2 text-sm text-destructive">{payError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
