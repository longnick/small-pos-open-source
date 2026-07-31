import type { OrderItem } from "./types";

type DiscountType = "amount" | "percent";
type CalcItem = Pick<OrderItem, "price" | "quantity" | "cancelledAt">;

function money(value: number, name: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
    throw new TypeError(`${name} must be a finite safe integer`);
  }
  if (value < 0) throw new RangeError(`${name} must not be negative`);
}

function quantity(value: number): void {
  money(value, "quantity");
  if (value === 0) throw new RangeError("quantity must be positive");
}

function safeAdd(left: number, right: number): number {
  if (left > Number.MAX_SAFE_INTEGER - right) throw new RangeError("calculation overflow");
  return left + right;
}

export function computeSubtotal(items: readonly CalcItem[]): number {
  let subtotal = 0;

  for (const item of items) {
    money(item.price, "price");
    quantity(item.quantity);
    if (item.cancelledAt !== undefined) {
      if (!Number.isSafeInteger(item.cancelledAt)) {
        throw new TypeError("cancelledAt must be a finite safe integer");
      }
      continue;
    }
    if (item.price !== 0 && item.quantity > Math.floor(Number.MAX_SAFE_INTEGER / item.price)) {
      throw new RangeError("calculation overflow");
    }
    subtotal = safeAdd(subtotal, item.price * item.quantity);
  }

  return subtotal;
}

export function computeDiscount(subtotal: number, type: DiscountType, value: number): number {
  money(subtotal, "subtotal");
  money(value, "discount value");

  if (type === "amount") return Math.min(value, subtotal);
  if (type !== "percent") throw new TypeError("discount type must be amount or percent");
  if (value > 100) throw new RangeError("percent must be between 0 and 100");

  const discount = Math.floor(subtotal / 100) * value + Math.floor((subtotal % 100) * value / 100);
  return Math.min(discount, subtotal);
}

export function computeTotal(subtotal: number, discount: number): number {
  money(subtotal, "subtotal");
  money(discount, "discount");
  return Math.max(0, subtotal - discount);
}

export function computeChange(paid: number, total: number): number {
  money(paid, "paid");
  money(total, "total");
  return Math.max(0, paid - total);
}
