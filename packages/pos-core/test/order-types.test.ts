import { expect, test } from "vitest";
import type { Order, OrderItem, OrderStatus } from "../src/types";

const statuses = ["open", "sent", "paid", "cancelled"] as const satisfies readonly OrderStatus[];

const item: OrderItem = {
  id: "order-item-espresso",
  orderId: "order-1",
  catalogItemId: "item-espresso",
  name: "Espresso",
  price: 30000,
  quantity: 2,
  note: "No sugar",
  cancelledAt: 0,
  cancelReason: "Customer changed mind",
};

const amountDiscountOrder: Order = {
  id: "order-amount-discount",
  tenantId: "tenant-demo",
  tableId: "table-1",
  staffId: "staff-demo",
  status: "open",
  items: [],
  subtotal: 30000,
  discount: 5000,
  discountType: "amount",
  total: 25000,
  createdAt: 0,
};

const order: Order = {
  id: item.orderId,
  tenantId: "tenant-demo",
  tableId: "table-1",
  staffId: "staff-demo",
  status: "paid",
  items: [item],
  subtotal: 60000,
  discount: 10,
  discountType: "percent",
  discountPercent: 10,
  total: 54000,
  createdAt: 0,
  sentAt: 1,
  paidAt: 2,
  cancelledAt: 3,
};

test("order fixtures use all status literals and contract fields", () => {
  expect(statuses).toEqual(["open", "sent", "paid", "cancelled"]);
  expect(order.items).toEqual([item]);
});
