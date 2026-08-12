import type { DemoPosBootstrap } from "../../src/pos/demo-pos-bootstrap";

/** E2E-only open-order fixture, injected by vite.e2e.config.ts at build time. */
export async function bootstrapDemoPos(): Promise<DemoPosBootstrap> {
  return {
    catalogGroups: [],
    catalogItems: [],
    tables: [{
      id: "table-e2e-1", tenantId: "tenant-e2e", number: 1, status: "occupied",
      currentOrderId: "order-e2e-payment", openedAt: 0, staffId: "fixture-manager",
    }],
    currentOrder: {
      id: "order-e2e-payment", tenantId: "tenant-e2e", tableId: "table-e2e-1",
      staffId: "fixture-manager", status: "open", createdAt: 0,
      items: [{ id: "line-e2e-coffee", orderId: "order-e2e-payment", catalogItemId: "coffee-e2e", name: "E2E Coffee", price: 50_000, quantity: 1 }],
      subtotal: 50_000, discount: 0, discountType: "amount", total: 50_000,
    },
  };
}
