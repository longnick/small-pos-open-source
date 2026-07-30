import { expect, test } from "vitest";
import type { Payment, PaymentMethod, Shift } from "../src/types";

const methods = ["cash", "transfer", "card", "other"] as const satisfies readonly PaymentMethod[];

const payment: Payment = {
  id: "payment-1",
  tenantId: "tenant-demo",
  orderId: "order-1",
  amount: 54000,
  method: "cash",
  staffId: "staff-demo",
  createdAt: 0,
  note: "Exact change",
};

const shift: Shift = {
  id: "shift-1",
  tenantId: "tenant-demo",
  staffId: "staff-demo",
  openedAt: 0,
  closedAt: 1,
  openingCash: 100000,
  closingCash: 154000,
  note: "Morning shift",
};

test("payment and shift fixtures use contract fields", () => {
  expect(methods).toEqual(["cash", "transfer", "card", "other"]);
  expect(payment).toMatchObject({ amount: 54000, method: "cash" });
  expect(shift).toMatchObject({ openingCash: 100000, closingCash: 154000 });
});
