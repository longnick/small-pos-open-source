import type { Order, Payment } from "./types";

export interface ShiftReport {
  totalRevenue: number;
  totalOrders: number;
  totalCash: number;
  totalTransfer: number;
  totalDiscount: number;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
}

function nonnegative(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${name} must be a safe integer`);
  if (value < 0) throw new RangeError(`${name} must not be negative`);
}

function positive(value: number): void {
  nonnegative(value, "quantity");
  if (value === 0) throw new RangeError("quantity must be positive");
}

function add(left: number, right: number): number {
  if (left > Number.MAX_SAFE_INTEGER - right) throw new RangeError("calculation overflow");
  return left + right;
}

function multiply(left: number, right: number): number {
  if (left !== 0 && right > Math.floor(Number.MAX_SAFE_INTEGER / left)) {
    throw new RangeError("calculation overflow");
  }
  return left * right;
}

export function computeShiftReport(
  orders: readonly Order[],
  payments: readonly Payment[],
): ShiftReport {
  let totalRevenue = 0;
  let totalDiscount = 0;
  let totalCash = 0;
  let totalTransfer = 0;
  let totalOrders = 0;
  const items = new Map<string, { name: string; quantity: number; revenue: number }>();
  const paidOrderIds = new Set<string>();

  for (const order of orders) {
    if (order.status !== "paid") continue;
    nonnegative(order.total, "total");
    nonnegative(order.discount, "discount");
    totalRevenue = add(totalRevenue, order.total);
    totalDiscount = add(totalDiscount, order.discount);
    totalOrders = add(totalOrders, 1);
    paidOrderIds.add(order.id);

    for (const item of order.items) {
      nonnegative(item.price, "price");
      positive(item.quantity);
      if (item.cancelledAt !== undefined) continue;
      const revenue = multiply(item.price, item.quantity);
      const previous = items.get(item.catalogItemId);
      if (previous) {
        previous.quantity = add(previous.quantity, item.quantity);
        previous.revenue = add(previous.revenue, revenue);
      } else {
        items.set(item.catalogItemId, { name: item.name, quantity: item.quantity, revenue });
      }
    }
  }

  for (const payment of payments) {
    if (!paidOrderIds.has(payment.orderId)) continue;
    nonnegative(payment.amount, "amount");
    if (payment.method === "cash") totalCash = add(totalCash, payment.amount);
    if (payment.method === "transfer") totalTransfer = add(totalTransfer, payment.amount);
  }

  return {
    totalRevenue,
    totalOrders,
    totalCash,
    totalTransfer,
    totalDiscount,
    topItems: [...items.values()].sort(
      (left, right) =>
        right.revenue - left.revenue || (left.name < right.name ? -1 : left.name > right.name ? 1 : 0),
    ),
  };
}
