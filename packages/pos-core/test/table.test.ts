import { expect, test } from "vitest";
import type { PosTable, TableStatus } from "../src/types";

const statuses = ["empty", "occupied", "waiting_payment"] as const satisfies readonly TableStatus[];

const table: PosTable = {
  id: "table-1",
  tenantId: "tenant-demo",
  number: 1,
  status: "occupied",
  openedAt: 0,
  staffId: "staff-demo",
};

test("table contract permits exact statuses and optional current order", () => {
  expect(statuses).toEqual(["empty", "occupied", "waiting_payment"]);
  expect(table.currentOrderId).toBeUndefined();
  expect(table).toMatchObject({ number: 1, openedAt: 0 });
});
