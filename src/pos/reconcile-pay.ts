import type { AuditEntry, Order, Payment, PosTable } from "../../packages/pos-core/src/types";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import type { DurablePaySnapshot } from "./dexie-persist";

export function reconcileLocalPayFromDurable(
  durable: DurablePaySnapshot,
  local: { localPaymentId: string; predecessor: Order },
): "predecessor" | "winner" | "none" {
  const predecessor = local.predecessor;
  const durableOrder = durable.order;
  if (
    durable.table.status === "occupied"
    && durable.table.currentOrderId === predecessor.id
    && durableOrder
    && (durableOrder.status === "open" || durableOrder.status === "sent")
    && durableOrder.id === predecessor.id
    && durableOrder.tenantId === predecessor.tenantId
    && durable.payments.length === 0
  ) {
    useOrderPaymentStore.getState().revertUnpersistedPayment({
      paymentId: local.localPaymentId,
      predecessor: durableOrder,
    });
    useCatalogTableStore.getState().restoreOccupiedTable(durableOrder.tableId, durableOrder.id, durableOrder.tenantId);
    return "predecessor";
  }

  const winner = durable.payments[0];
  const winnerAudit = durable.audits.find((entry) => entry.id === `payment:${winner?.id}`);
  if (
    durableOrder?.status === "paid"
    && durable.table.status === "empty"
    && winner
    && winnerAudit
    && durable.payments.length === 1
  ) {
    applyWinner(durable.table, durableOrder, winner, winnerAudit, local);
    return "winner";
  }
  return "none";
}

function applyWinner(
  table: PosTable,
  _order: Order,
  payment: Payment,
  _audit: AuditEntry,
  local: { localPaymentId: string; predecessor: Order },
): void {
  const store = useOrderPaymentStore.getState();
  if (store.currentOrder?.status === "paid") {
    store.revertUnpersistedPayment({ paymentId: local.localPaymentId, predecessor: local.predecessor });
  }
  if (useOrderPaymentStore.getState().currentOrder?.status !== "paid") {
    if (useOrderPaymentStore.getState().currentOrder?.id !== local.predecessor.id) {
      useOrderPaymentStore.getState().selectOpenOrder(local.predecessor);
    }
    useOrderPaymentStore.getState().recordPayment(payment);
  }
  const catalog = useCatalogTableStore.getState();
  if (catalog.tenantId === table.tenantId) {
    catalog.replaceTenantData(table.tenantId, {
      catalogGroups: catalog.catalogGroups,
      catalogItems: catalog.catalogItems,
      tables: catalog.tables.map((row) => (row.id === table.id ? { ...table } : { ...row })),
    });
  }
}
