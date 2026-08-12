import type { DemoPosBootstrap } from "../../src/pos/demo-pos-bootstrap";

/**
 * E2E-only order-entry fixture, injected by vite.order-entry-e2e.config.ts at
 * build time via module alias.
 *
 * Provides:
 *   - One empty Bàn 1 (no current order) so the E2E can occupy it.
 *   - Two available catalog items in one group:
 *       Cà phê đen  25 000 VND
 *       Trà chanh   20 000 VND
 *   - No pre-loaded currentOrder (null) — the test drives the full add-item flow.
 *
 * Total after 2× Cà phê đen + 1× Trà chanh = 25 000×2 + 20 000 = 70 000 VND.
 */
export async function bootstrapDemoPos(): Promise<DemoPosBootstrap> {
  return {
    catalogGroups: [
      {
        id: "group-drinks",
        tenantId: "tenant-e2e",
        name: "Đồ uống",
        sortOrder: 0,
      },
    ],
    catalogItems: [
      {
        id: "item-ca-phe-den",
        tenantId: "tenant-e2e",
        groupId: "group-drinks",
        name: "Cà phê đen",
        price: 25_000,
        available: true,
        sortOrder: 0,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "item-tra-chanh",
        tenantId: "tenant-e2e",
        groupId: "group-drinks",
        name: "Trà chanh",
        price: 20_000,
        available: true,
        sortOrder: 1,
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    tables: [
      {
        id: "table-order-e2e-1",
        tenantId: "tenant-e2e",
        number: 1,
        status: "empty",
        openedAt: 0,
        staffId: "fixture-manager",
      },
    ],
    currentOrder: null,
  };
}
