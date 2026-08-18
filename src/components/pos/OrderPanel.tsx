import React, { useState, useRef, useLayoutEffect } from "react";
import { ChefHat, Minus, Plus, Receipt, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useOrderPaymentStore } from "@/stores/order-payment-store";
import { useTenantAuthStore } from "@/stores/tenant-auth-store";
import { isDexiePersistSession, persistAfterOrderEdit, persistAfterSend } from "@/pos/dexie-persist";
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
  onPaymentSuccess?: () => boolean | void;
  onReceiptClose?: () => void;
}

// ---------------------------------------------------------------------------
// OrderPanel
// ---------------------------------------------------------------------------

export function OrderPanel({ selectedTable, onBeforePaymentConfirm, onPaymentSuccess, onReceiptClose }: OrderPanelProps) {
  const currentOrder = useOrderPaymentStore((state) => state.currentOrder);
  const updateItemQuantity = useOrderPaymentStore((state) => state.updateItemQuantity);
  const removeItem = useOrderPaymentStore((state) => state.removeItem);
  const sendToKitchen = useOrderPaymentStore((state) => state.sendToKitchen);

  const persistEdit = () => {
    if (!isDexiePersistSession()) return;
    const tenantId = useTenantAuthStore.getState().tenant?.id;
    const order = useOrderPaymentStore.getState().currentOrder;
    if (tenantId && order) void persistAfterOrderEdit({ authenticatedTenantId: tenantId }, { order });
  };

  // Local dialog state – no store write
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Local live-region announcement state – no store write
  const [announcement, setAnnouncement] = useState("");

  // ---------------------------------------------------------------------------
  // Focus recovery refs (microtask 3)
  // ---------------------------------------------------------------------------

  // Map of item id → trash button element
  const trashRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  // Ref for the empty-state container (programmatic focus only, tabIndex=-1)
  const emptyStateRef = useRef<HTMLDivElement | null>(null);

  // Pending focus target set synchronously on delete; consumed by useLayoutEffect.
  // "empty-state" is a sentinel for focusing the empty-state element.
  // Any other string is the item id whose trash button should receive focus.
  const [pendingFocusTarget, setPendingFocusTarget] = useState<string | null>(null);

  // After the DOM has updated (removed row is gone, new rows rendered),
  // focus the appropriate element and clear the pending target.
  useLayoutEffect(() => {
    if (pendingFocusTarget === null) return;
    if (pendingFocusTarget === "empty-state") {
      emptyStateRef.current?.focus();
    } else {
      trashRefs.current.get(pendingFocusTarget)?.focus();
    }
    setPendingFocusTarget(null);
  }, [pendingFocusTarget]);

  // Helper: compute focus target from snapshot + deleted index
  function computeFocusTarget(
    snapshot: typeof currentOrder extends null | undefined ? never : NonNullable<typeof currentOrder>["items"],
    deletedIndex: number,
  ): string {
    const remaining = snapshot.filter((_, i) => i !== deletedIndex);
    if (remaining.length === 0) return "empty-state";
    // Prefer next (same index in remaining), fallback to previous
    const target = remaining[deletedIndex] ?? remaining[deletedIndex - 1];
    return target.id;
  }

  // Enabled when the current order can still be paid.
  const canOpenPayment =
    (currentOrder?.status === "open" || currentOrder?.status === "sent") && currentOrder.items.length > 0;
  const canSendKitchen = currentOrder?.status === "open" && currentOrder.items.length > 0;

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
          <div
            ref={emptyStateRef}
            data-testid="order-empty-state"
            tabIndex={-1}
            role="region"
            aria-label="Chọn món để thêm vào đơn"
            className="flex flex-col items-center justify-center py-10 text-muted-foreground"
          >
            <Receipt className="mb-2 h-10 w-10 opacity-40" aria-hidden="true" />
            <p className="text-sm">Chọn món để thêm vào đơn</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3 list-none m-0 p-0">
            {currentOrder!.items.map((item, index) => (
              <li
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
                    aria-label={`Giảm số lượng ${item.name}`}
                    onClick={() => {
                      if (item.quantity === 1) {
                        // Snapshot items and index before removal
                        const snapshot = currentOrder!.items;
                        const deletedIndex = index;
                        const ok = removeItem(item.id);
                        if (ok) {
                          const remaining = snapshot.length - 1;
                          setAnnouncement(
                            remaining === 0
                              ? `Đã xóa ${item.name} khỏi đơn. Đơn hàng trống.`
                              : `Đã xóa ${item.name} khỏi đơn. Còn ${remaining} món.`,
                          );
                          setPendingFocusTarget(computeFocusTarget(snapshot, deletedIndex));
                          persistEdit();
                        }
                      } else {
                        const ok = updateItemQuantity(item.id, item.quantity - 1);
                        if (ok) {
                          setAnnouncement(`${item.name}, số lượng ${item.quantity - 1}`);
                          persistEdit();
                        }
                      }
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors disabled:opacity-40"
                  >
                    <Minus className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold" aria-hidden="true">
                    {item.quantity}
                  </span>
                  <span className="sr-only">{`Số lượng ${item.name}: ${item.quantity}`}</span>
                  <button
                    aria-label={`Tăng số lượng ${item.name}`}
                    onClick={() => {
                      const ok = updateItemQuantity(item.id, item.quantity + 1);
                      if (ok) {
                        setAnnouncement(`${item.name}, số lượng ${item.quantity + 1}`);
                        persistEdit();
                      }
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    ref={(el) => {
                      trashRefs.current.set(item.id, el);
                      return () => { trashRefs.current.delete(item.id); };
                    }}
                    aria-label={`Xóa ${item.name} khỏi đơn`}
                    onClick={() => {
                      // Snapshot items and index before removal
                      const snapshot = currentOrder!.items;
                      const deletedIndex = index;
                      const remaining = snapshot.length - 1;
                      const ok = removeItem(item.id);
                      if (ok) {
                        setAnnouncement(
                          remaining === 0
                            ? `Đã xóa ${item.name} khỏi đơn. Đơn hàng trống.`
                            : `Đã xóa ${item.name} khỏi đơn. Còn ${remaining} món.`,
                        );
                        setPendingFocusTarget(computeFocusTarget(snapshot, deletedIndex));
                        persistEdit();
                      }
                    }}
                    className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
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

      {/* Action buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          className="h-12 text-sm font-semibold"
          disabled={!canSendKitchen}
          onClick={canSendKitchen ? () => {
            const ok = sendToKitchen(Date.now());
            if (!ok) return;
            setAnnouncement("Đã gửi bếp");
            if (isDexiePersistSession()) {
              const tenantId = useTenantAuthStore.getState().tenant?.id;
              const order = useOrderPaymentStore.getState().currentOrder;
              if (tenantId && order) void persistAfterSend({ authenticatedTenantId: tenantId }, { order });
            }
          } : undefined}
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
          onReceiptClose={onReceiptClose}
          onOpenChange={setIsPaymentOpen}
        />
      )}

      {/* Always-mounted live region for screen-reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </div>
  );
}
