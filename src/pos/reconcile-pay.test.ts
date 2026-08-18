import { beforeEach, expect, test } from "vitest";
import type { AuditEntry, Order, Payment, PosTable } from "../../packages/pos-core/src/types";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import { useTenantAuthStore } from "../stores/tenant-auth-store";
import { planPayReconcile, commitPayReconcile, reconcileLocalPayFromDurable } from "./reconcile-pay";

const tenantId = "tenant-1";
const staff = { id: "staff-1", tenantId, name: "Cashier", role: "cashier" as const, pinHash: "v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", createdAt: 0 };

const occupied = (): PosTable => ({
  id: "table-1", tenantId, number: 1, status: "occupied", openedAt: 0, staffId: "staff-1", currentOrderId: "order-1",
});
const empty = (): PosTable => ({ id: "table-1", tenantId, number: 1, status: "empty", openedAt: 0, staffId: "staff-1" });
const line = () => ({ id: "line-1", orderId: "order-1", catalogItemId: "item-1", name: "Cà phê đen", price: 25_000, quantity: 1 });
const openOrder = (): Order => ({
  id: "order-1", tenantId, tableId: "table-1", staffId: "staff-1", status: "open",
  items: [line()], subtotal: 25_000, discount: 0, discountType: "amount", total: 25_000, createdAt: 1,
});
const paidOrder = (): Order => ({ ...openOrder(), status: "paid", paidAt: 20 });
const payment = (id = "pay-1"): Payment => ({
  id, tenantId, orderId: "order-1", amount: 25_000, tender: 25_000, method: "cash", staffId: "staff-1", createdAt: 20,
});
const payAudit = (id = "pay-1"): AuditEntry => ({
  id: `payment:${id}`, tenantId, staffId: "staff-1", action: "payment.recorded", entityType: "order", entityId: "order-1",
  details: { paymentId: id, method: "cash", paidTotal: 25_000, tender: 25_000, change: 0 }, timestamp: 20,
});

beforeEach(() => {
  useTenantAuthStore.setState({ tenant: null, staff });
  useCatalogTableStore.setState({
    tenantId,
    catalogGroups: [],
    catalogItems: [],
    tables: [occupied()],
  });
  useOrderPaymentStore.getState().clearCurrentOrder();
  useOrderPaymentStore.setState({ payments: Object.freeze([]) as unknown as Payment[], auditEntries: [], lastReceipt: null });
});

test("reconcile restores predecessor only when durable is occupied, exact predecessor, zero payment", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  expect(useCatalogTableStore.getState().releaseTable("table-1", "order-1")).toBe(true);

  expect(reconcileLocalPayFromDurable({
    table: occupied(),
    order: openOrder(),
    payments: [],
    audits: [],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "predecessor" });

  expect(useOrderPaymentStore.getState().currentOrder).toMatchObject({ status: "open", id: "order-1" });
  expect(useOrderPaymentStore.getState().payments).toEqual([]);
  expect(useCatalogTableStore.getState().tableById("table-1")).toMatchObject({ status: "occupied", currentOrderId: "order-1" });
});

test("reconcile adopts durable winner paid + empty table and blocks a second local pay", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);

  expect(reconcileLocalPayFromDurable({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "winner" });

  expect(useOrderPaymentStore.getState().currentOrder).toMatchObject({ status: "paid", paidAt: 20 });
  expect(useOrderPaymentStore.getState().payments).toEqual([payment("pay-1")]);
  expect(useOrderPaymentStore.getState().lastReceipt).toBeNull();
  expect(useCatalogTableStore.getState().tableById("table-1")).toMatchObject({ status: "empty" });
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-3"))).toBe(false);
});

test("applyDurableTable rejects waiting_payment and occupied missing binding without mutation", () => {
  const waiting = { ...occupied(), status: "waiting_payment" as const, currentOrderId: "order-other" };
  useCatalogTableStore.setState({ tenantId, catalogGroups: [], catalogItems: [], tables: [waiting] });
  expect(useCatalogTableStore.getState().applyDurableTable(empty(), "order-1")).toBe(false);
  expect(useCatalogTableStore.getState().tableById("table-1")).toEqual(waiting);

  const unbound = { ...occupied(), currentOrderId: undefined };
  useCatalogTableStore.setState({ tenantId, catalogGroups: [], catalogItems: [], tables: [unbound] });
  expect(useCatalogTableStore.getState().applyDurableTable(empty(), "order-1")).toBe(false);
  expect(useCatalogTableStore.getState().tableById("table-1")).toMatchObject({ status: "occupied" });
});

test("plan rejects and commit does not mutate when durable order totals or line links are invalid", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  const beforeTable = useCatalogTableStore.getState().tableById("table-1");
  const beforeOrder = useOrderPaymentStore.getState().currentOrder;
  const badTotal = { ...paidOrder(), total: 99_000 };
  const plan = planPayReconcile({
    table: empty(),
    order: badTotal,
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() });
  expect(plan).toEqual({ kind: "rejected" });
  expect(commitPayReconcile(plan)).toEqual({ kind: "rejected" });
  expect(useCatalogTableStore.getState().tableById("table-1")).toEqual(beforeTable);
  expect(useOrderPaymentStore.getState().currentOrder).toEqual(beforeOrder);
});

test("plan rejects duplicate line IDs, foreign line orderId, and paidAt before createdAt", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  const dup = { ...paidOrder(), items: [line(), { ...line(), catalogItemId: "item-2" }] };
  expect(planPayReconcile({
    table: empty(), order: dup, payments: [payment("pay-1")], audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });

  const foreign = { ...paidOrder(), items: [{ ...line(), orderId: "order-other" }] };
  expect(planPayReconcile({
    table: empty(), order: foreign, payments: [payment("pay-1")], audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });

  const early = { ...paidOrder(), paidAt: 0 };
  expect(planPayReconcile({
    table: empty(), order: early, payments: [{ ...payment("pay-1"), createdAt: 0 }],
    audits: [{ ...payAudit("pay-1"), timestamp: 0 }],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });
});

test("commit rejects when local payment or current order changed after plan", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  const plan = planPayReconcile({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() });
  expect(plan.kind).toBe("winner");
  useOrderPaymentStore.getState().clearCurrentOrder();
  useOrderPaymentStore.getState().selectOpenOrder({ ...openOrder(), id: "order-newer" });
  const before = useCatalogTableStore.getState().tableById("table-1");
  expect(commitPayReconcile(plan)).toEqual({ kind: "rejected" });
  expect(useCatalogTableStore.getState().tableById("table-1")).toEqual(before);
  expect(useOrderPaymentStore.getState().currentOrder?.id).toBe("order-newer");
});

test("reconcile does not report winner when local table is rebound to another order", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  useCatalogTableStore.setState({
    tenantId,
    catalogGroups: [],
    catalogItems: [],
    tables: [{ ...occupied(), currentOrderId: "order-other" }],
  });
  const before = useCatalogTableStore.getState().tableById("table-1");

  expect(reconcileLocalPayFromDurable({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });

  expect(useCatalogTableStore.getState().tableById("table-1")).toEqual(before);
});

test("reconcile does not report winner when winner graph is incomplete or extra payment audit exists", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  const beforePay = useOrderPaymentStore.getState().payments.map((row) => row.id);

  expect(reconcileLocalPayFromDurable({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });

  expect(reconcileLocalPayFromDurable({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1"), { ...payAudit("pay-extra"), id: "payment:pay-extra", details: { ...payAudit("pay-extra").details, paymentId: "pay-extra" } }],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });

  expect(useOrderPaymentStore.getState().payments.map((row) => row.id)).toEqual(beforePay);
});

const snapshotAll = () => ({
  order: structuredClone(useOrderPaymentStore.getState().currentOrder),
  payments: structuredClone(useOrderPaymentStore.getState().payments),
  audits: structuredClone(useOrderPaymentStore.getState().auditEntries),
  lastReceipt: structuredClone(useOrderPaymentStore.getState().lastReceipt),
  tenantId: useCatalogTableStore.getState().tenantId,
  tables: structuredClone(useCatalogTableStore.getState().tables),
});

const sendAudit = (): AuditEntry => ({
  id: "send:order-1",
  tenantId,
  staffId: "staff-1",
  action: "order.sent",
  entityType: "order",
  entityId: "order-1",
  details: { sentAt: 10 },
  timestamp: 10,
});

const sentOrder = (): Order => ({ ...openOrder(), status: "sent", sentAt: 10 });
const paidAfterSend = (): Order => ({ ...sentOrder(), status: "paid", paidAt: 20 });

test("commit restores exact precommit snapshots when table apply fails after order mutation", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  const before = snapshotAll();
  const plan = planPayReconcile({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() });
  expect(plan.kind).toBe("winner");
  const original = useCatalogTableStore.getState().applyDurableTable;
  useCatalogTableStore.setState({ applyDurableTable: () => false });
  expect(commitPayReconcile(plan)).toEqual({ kind: "rejected" });
  useCatalogTableStore.setState({ applyDurableTable: original });
  expect(snapshotAll()).toEqual(before);
});

test("commit restores exact snapshots if a subscriber mutates the table after order apply", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  const before = snapshotAll();
  const plan = planPayReconcile({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() });
  const unsub = useOrderPaymentStore.subscribe((state, prev) => {
    if (state.payments.some((row) => row.id === "pay-1") && !prev.payments.some((row) => row.id === "pay-1")) {
      useCatalogTableStore.setState({
        tables: [{ ...occupied(), currentOrderId: "order-hijack" }],
      });
    }
  });
  expect(commitPayReconcile(plan)).toEqual({ kind: "rejected" });
  unsub();
  expect(snapshotAll()).toEqual(before);
});

test("plan rejects forged or missing send/payment audit graphs", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  expect(planPayReconcile({
    table: occupied(),
    order: openOrder(),
    payments: [],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });
  expect(planPayReconcile({
    table: occupied(),
    order: openOrder(),
    payments: [],
    audits: [sendAudit()],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });

  useOrderPaymentStore.getState().clearCurrentOrder();
  useOrderPaymentStore.setState({ payments: Object.freeze([]) as never, auditEntries: [], lastReceipt: null });
  useOrderPaymentStore.getState().selectOpenOrder(sentOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  expect(planPayReconcile({
    table: occupied(),
    order: sentOrder(),
    payments: [],
    audits: [],
  }, { localPaymentId: "pay-loser", predecessor: sentOrder() })).toEqual({ kind: "rejected" });
  expect(planPayReconcile({
    table: empty(),
    order: paidAfterSend(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: sentOrder() })).toEqual({ kind: "rejected" });
  expect(planPayReconcile({
    table: empty(),
    order: paidAfterSend(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1"), sendAudit()],
  }, { localPaymentId: "pay-loser", predecessor: sentOrder() }).kind).toBe("winner");
});

test("plan rejects malformed durable table graphs", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  expect(planPayReconcile({
    table: { ...empty(), openedAt: 1.5 },
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });
  expect(planPayReconcile({
    table: { ...empty(), currentOrderId: "order-1" },
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });
  expect(planPayReconcile({
    table: { ...empty(), staffId: "staff-other" },
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });
});

test("plan durable graph is frozen and mutating it cannot change store after commit", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  const plan = planPayReconcile({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() });
  expect(plan.kind).toBe("winner");
  if (plan.kind !== "winner") return;
  expect(Object.isFrozen(plan.table)).toBe(true);
  expect(Object.isFrozen(plan.order)).toBe(true);
  expect(Object.isFrozen(plan.payment)).toBe(true);
  expect(Object.isFrozen(plan.audits)).toBe(true);
  expect(Object.isFrozen(plan.audits[0])).toBe(true);
  expect(Object.isFrozen(plan.audits[0].details)).toBe(true);
  expect(() => {
    (plan.order as { total: number }).total = 1;
  }).toThrow();
  expect(commitPayReconcile(plan)).toEqual({ kind: "winner" });
  expect(useOrderPaymentStore.getState().currentOrder?.total).toBe(25_000);
  expect(Object.isFrozen(useOrderPaymentStore.getState().currentOrder)).toBe(true);
});

test("commit rejects when caller mutates plan order between plan and commit", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  const plan = planPayReconcile({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() });
  expect(plan.kind).toBe("winner");
  if (plan.kind !== "winner") return;
  const mutated = { ...plan, order: { ...plan.order, total: 99_000 } };
  const before = snapshotAll();
  expect(commitPayReconcile(mutated)).toEqual({ kind: "rejected" });
  expect(snapshotAll()).toEqual(before);
});

test("plan rejects occupied durable table with mismatched number or openedAt", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  expect(planPayReconcile({
    table: { ...occupied(), number: 2 },
    order: openOrder(),
    payments: [],
    audits: [],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });
  expect(planPayReconcile({
    table: { ...occupied(), openedAt: 99 },
    order: openOrder(),
    payments: [],
    audits: [],
  }, { localPaymentId: "pay-loser", predecessor: openOrder() })).toEqual({ kind: "rejected" });
});

test("commit aborts without touching a new session if subscriber signs out during first apply", () => {
  useOrderPaymentStore.getState().selectOpenOrder(openOrder());
  expect(useOrderPaymentStore.getState().recordPayment(payment("pay-loser"))).toBe(true);
  const token = useTenantAuthStore.getState().sessionToken;
  const plan = planPayReconcile({
    table: empty(),
    order: paidOrder(),
    payments: [payment("pay-1")],
    audits: [payAudit("pay-1")],
  }, { localPaymentId: "pay-loser", predecessor: openOrder(), sessionToken: token });
  const unsub = useOrderPaymentStore.subscribe((state, prev) => {
    if (state.payments.some((row) => row.id === "pay-1") && !prev.payments.some((row) => row.id === "pay-1")) {
      useTenantAuthStore.getState().signOut();
    }
  });
  expect(commitPayReconcile(plan)).toEqual({ kind: "rejected" });
  unsub();
  expect(useOrderPaymentStore.getState().currentOrder?.status).toBe("paid");
  expect(useOrderPaymentStore.getState().payments.map((row) => row.id)).toEqual(["pay-loser"]);
  expect(useOrderPaymentStore.getState().payments.some((row) => row.id === "pay-1")).toBe(false);
  expect(useTenantAuthStore.getState().staff).toBeNull();
});
