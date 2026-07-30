import { expect, test } from "vitest";
import type { AuditEntry, DomainEvent } from "../src/types";

const audit: AuditEntry = {
  id: "audit-1",
  tenantId: "tenant-demo",
  staffId: "staff-demo",
  action: "order.opened",
  entityType: "order",
  entityId: "order-1",
  details: { source: "pos" },
  timestamp: 0,
};

const events = [
  { type: "order.opened", payload: { orderId: "order-1", tableId: "table-1" } },
  { type: "order.item_added", payload: { orderId: "order-1", itemId: "item-1" } },
  { type: "order.item_removed", payload: { orderId: "order-1", itemId: "item-1" } },
  { type: "order.sent", payload: { orderId: "order-1" } },
  { type: "order.paid", payload: { orderId: "order-1", paymentId: "payment-1" } },
  { type: "order.cancelled", payload: { orderId: "order-1", reason: "customer_request" } },
  { type: "table.opened", payload: { tableId: "table-1" } },
  { type: "table.transferred", payload: { fromTableId: "table-1", toTableId: "table-2" } },
  { type: "shift.opened", payload: { shiftId: "shift-1" } },
  { type: "shift.closed", payload: { shiftId: "shift-1" } },
  { type: "catalog.item_updated", payload: { itemId: "item-1" } },
] as const satisfies readonly DomainEvent[];

function eventField(event: DomainEvent): string {
  switch (event.type) {
    case "order.opened": return event.payload.tableId;
    case "order.item_added":
    case "order.item_removed": return event.payload.itemId;
    case "order.sent": return event.payload.orderId;
    case "order.paid": return event.payload.paymentId;
    case "order.cancelled": return event.payload.reason;
    case "table.opened": return event.payload.tableId;
    case "table.transferred": return event.payload.toTableId;
    case "shift.opened":
    case "shift.closed": return event.payload.shiftId;
    case "catalog.item_updated": return event.payload.itemId;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

test("audit and domain event fixtures use contract fields", () => {
  expect(audit).toMatchObject({ action: "order.opened", timestamp: 0 });
  expect(events.map(eventField)).toHaveLength(11);
});
