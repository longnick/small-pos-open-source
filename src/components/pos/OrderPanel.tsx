import React, { useState } from "react";
import { ChefHat, Minus, Plus, Receipt, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useOrderPaymentStore } from "@/stores/order-payment-store";
import { formatCurrency } from "@/lib/pos";
import type { PosTable } from "../../../packages/pos-core/src/types";
import { PaymentModal } from "./PaymentModal";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OrderPanelProps {
  /** Presentation-only. Drives the heading subtitle only. No store writes. */
  selectedTable: PosTable | null;
  /**
   * Called synchronously before `recordPayment` to validate cross-store
   * preconditions (table releasable).  Return `false` to abort payment.
   * Optional: when absent no pre-validation is performed.
   */
  onBeforePaymentConfirm?: () => boolean;
  /**
   * Called after a successful payment so the parent can perform post-payment
   * lifecycle actions (release table, clear order selection, clear UI selection).
   * Optional: when absent no post-payment lifecycle is triggered.
   */
  onPaymentSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// OrderPanel
// ---------------------------------------------------------------------------

export function OrderPanel({ selectedTable, onBeforePaymentConfirm, onPaymentSuccess }: OrderPanelProps) {
  const currentOrder = useOrderPaymentStore((state) => state.currentOrder);

  // Local dialog state – no store write
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Enabled only when there is an open order with at least one item
  const canOpenPayment =
    currentOrder?.status === "open" && currentOrder.items.length > 0;

  // Heading is always "Đơn hàng". Only the subtitle adapts to selectedTable.
  const headingText = "Đơn hàng";

  const subtitleText = selectedTable
    ? `${currentOrder?.items.length ?? 0} món`
    : "Chưa chọn bàn";

  // Empty state: no order loaded at all, or order exists but items array is empty.
  const isEmpty = !currentOrder || currentOrder.items.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2
            className="text-lg font-bold text-foreground"
            role="heading"
            aria-level={2}
          >
            {headingText}
          </h2>
          <p className="text-xs text-muted-foreground">{subtitleText}</p>
        </div>
      </div>

      {/* Order item list / empty state */}
      <ScrollArea className="flex-1 -mx-1 px-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Receipt className="mb-2 h-10 w-10 opacity-40" aria-hidden="true" />
            <p className="text-sm">Chọn món để thêm vào đơn</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {currentOrder!.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-card-foreground text-sm">
                    {item.name}
                  </p>
                  {item.note && (
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled
                    aria-label="Giảm số lượng"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors disabled:opacity-40"
                  >
                    <Minus className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    disabled
                    aria-label="Tăng số lượng"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    disabled
                    aria-label="Xóa món"
                    className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <Separator className="my-3" />

      {/* Totals – read directly from store; no local recomputation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tạm tính</span>
          <span>{formatCurrency(currentOrder?.subtotal ?? 0)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Tổng cộng</span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(currentOrder?.total ?? 0)}
          </span>
        </div>
      </div>

      {/* Action buttons – always disabled; no behavior */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          className="h-12 text-sm font-semibold"
          disabled
        >
          <ChefHat className="mr-2 h-4 w-4" aria-hidden="true" />
          Gửi bếp
        </Button>
        <Button
          className="h-12 bg-primary text-sm font-semibold text-primary-foreground shadow-sm"
          disabled={!canOpenPayment}
          onClick={canOpenPayment ? () => setIsPaymentOpen(true) : undefined}
        >
          <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
          Thanh toán
        </Button>
      </div>

      {isPaymentOpen && currentOrder && (
        <PaymentModal
          open={isPaymentOpen}
          orderTotal={currentOrder.total}
          orderId={currentOrder.id}
          tenantId={currentOrder.tenantId}
          staffId={currentOrder.staffId}
          onBeforeConfirm={onBeforePaymentConfirm}
          onPaymentSuccess={onPaymentSuccess}
          onOpenChange={setIsPaymentOpen}
        />
      )}
    </div>
  );
}
