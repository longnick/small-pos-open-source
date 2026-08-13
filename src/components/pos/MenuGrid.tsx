import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import type { CatalogGroup, CatalogItem } from "../../../packages/pos-core/src/types";
import { cn } from "@/lib/utils";
import { useOrderPaymentStore } from "../../stores/order-payment-store";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MenuGridProps {
  groups: CatalogGroup[];
  items: CatalogItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortedGroups(groups: CatalogGroup[]): CatalogGroup[] {
  return [...groups].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
}

function sortedAvailableItemsForGroup(
  items: CatalogItem[],
  groupId: string,
): CatalogItem[] {
  return items
    .filter((item) => item.groupId === groupId && item.available)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function formatVnd(price: number): string {
  return price.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

function normalise(text: string): string {
  return text.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MenuGrid({ groups, items }: MenuGridProps) {
  const orderedGroups = useMemo(() => sortedGroups(groups), [groups]);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    () => orderedGroups[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");

  const { currentOrder, addItem, updateItemQuantity } = useOrderPaymentStore();

  // Reconcile: if the active group was removed, reset to first current group.
  useEffect(() => {
    if (orderedGroups.length === 0) {
      setActiveGroupId(null);
      return;
    }
    const stillExists = orderedGroups.some((g) => g.id === activeGroupId);
    if (!stillExists) {
      setActiveGroupId(orderedGroups[0].id);
    }
  }, [orderedGroups, activeGroupId]);

  function handleAddItem(catalogItem: CatalogItem) {
    if (!currentOrder || currentOrder.status !== "open") return;

    const existingLine = currentOrder.items.find(
      (line) => line.catalogItemId === catalogItem.id,
    );

    if (existingLine) {
      updateItemQuantity(existingLine.id, existingLine.quantity + 1);
    } else {
      const lineId = `${currentOrder.id}-${catalogItem.id}-${Date.now()}`;
      addItem({
        id: lineId,
        orderId: currentOrder.id,
        catalogItemId: catalogItem.id,
        name: catalogItem.name,
        price: catalogItem.price,
        quantity: 1,
      });
    }
  }

  const visibleItems = useMemo<CatalogItem[]>(() => {
    if (!activeGroupId) return [];
    const base = sortedAvailableItemsForGroup(items, activeGroupId);
    const q = normalise(search);
    if (!q) return base;
    return base.filter((item) => normalise(item.name).includes(q));
  }, [items, activeGroupId, search]);

  // --- empty catalog ---
  if (orderedGroups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
        <span role="status" aria-label="Chưa có món để hiển thị">
          Chưa có món để hiển thị
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* Heading */}
      <h2 className="text-xl font-semibold text-foreground">Thực đơn</h2>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          role="searchbox"
          type="search"
          placeholder="Tìm món..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "w-full rounded-md border border-input bg-background py-2 pl-9 pr-3",
            "text-sm placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring",
          )}
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {orderedGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => {
              setActiveGroupId(group.id);
              setSearch("");
            }}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeGroupId === group.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            )}
          >
            {group.name}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleItems.length === 0 ? (
          <div className="flex h-full items-center justify-center py-8 text-sm text-muted-foreground">
            Không tìm thấy món nào
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col rounded-lg border border-border bg-card p-3 shadow-sm"
              >
                <span className="line-clamp-2 flex-1 text-sm font-medium text-card-foreground">
                  {item.name}
                </span>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-primary">
                    {formatVnd(item.price)}
                  </span>
                  <button
                    type="button"
                    aria-label={`+ ${item.name}`}
                    onClick={() => handleAddItem(item)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full",
                      "bg-primary text-primary-foreground",
                      "text-base font-bold leading-none",
                      "transition-colors hover:bg-primary/90",
                    )}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
