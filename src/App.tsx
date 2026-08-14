import { useEffect, useRef, useState } from "react";
import { bootstrapDemoAuth } from "@/auth/demo-auth-adapter";
import { bootstrapDemoPos } from "@/pos/demo-pos-bootstrap";
import { hydrateFromDexie } from "@/pos/dexie-hydrate";
import { isDexiePersistSession, persistAfterOccupy, persistAfterPay, setDexiePersistSession } from "@/pos/dexie-persist";
import { loadOpenOrderForTable } from "@/pos/dexie-restore";
import { PinLoginScreen } from "@/components/auth/PinLogin";
import { useTenantAuthStore } from "@/stores/tenant-auth-store";
import { useCatalogTableStore } from "@/stores/catalog-table-store";
import { useOrderPaymentStore } from "@/stores/order-payment-store";
import type { Staff, Tenant } from "../packages/pos-core/src/types";
import type { PinHashVerifier } from "../packages/pos-core/src/auth";
import {
  Coffee,
  ChefHat,
  Clock,
  User,
  LayoutGrid,
  BookOpen,
  BarChart3,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuGrid } from "@/components/pos/MenuGrid";
import { MenuManagement } from "@/components/pos/MenuManagement";
import { ReportsPanel } from "@/components/pos/ReportsPanel";
import { StaffManagement } from "@/components/pos/StaffManagement";
import { KitchenPanel } from "@/components/pos/KitchenPanel";
import { TableMap } from "@/components/pos/TableMap";
import { OrderPanel } from "@/components/pos/OrderPanel";

const VIEWS = [
  { id: "pos", name: "Bán hàng", icon: LayoutGrid },
  { id: "kitchen", name: "Bếp", icon: ChefHat },
  { id: "menu", name: "Quản lý món", icon: BookOpen },
  { id: "report", name: "Báo cáo", icon: BarChart3 },
  { id: "staff", name: "Nhân sự", icon: Users },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

// --- Components ---

// --- Main Page (existing Lovable shell — do not modify) ---

function PosShell() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const tables = useCatalogTableStore((state) => state.tables);
  const catalogGroups = useCatalogTableStore((state) => state.catalogGroups);
  const catalogItems = useCatalogTableStore((state) => state.catalogItems);
  const releaseTable = useCatalogTableStore((state) => state.releaseTable);
  const occupyTable = useCatalogTableStore((state) => state.occupyTable);
  const clearCurrentOrder = useOrderPaymentStore((state) => state.clearCurrentOrder);
  const createOpenOrder = useOrderPaymentStore((state) => state.createOpenOrder);
  const [view, setView] = useState<ViewId>("pos");
  const orderItemCount = useOrderPaymentStore((state) => state.currentOrder?.items.length ?? 0);
  const currentOrder = useOrderPaymentStore((state) => state.currentOrder);
  const { tenant, staff } = useTenantAuthStore();

  // Clear selection when the selected table no longer exists in the store
  useEffect(() => {
    if (selectedTableId !== null && !tables.some((t) => t.id === selectedTableId)) {
      setSelectedTableId(null);
    }
  }, [tables, selectedTableId]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;

  /**
   * Atomic table-selection handler.
   *
   * If currentOrder exists: only highlight (React state). Never swap the order.
   * If occupied / waiting_payment, no currentOrder, persist session on:
   *   load the bound open order, then selectOpenOrder, then highlight.
   * If empty and no currentOrder:
   *   occupyTable then createOpenOrder; rollback occupy on create fail.
   */
  const handleTableSelect = (id: string): void => {
    // Never replace an existing order.
    if (currentOrder !== null) {
      setSelectedTableId(id);
      return;
    }
    const table = useCatalogTableStore.getState().tableById(id);
    if (!table) return;
    if (table.status === "occupied" || table.status === "waiting_payment") {
      if (!isDexiePersistSession() || !tenant) return;
      const expectedOrderId = table.currentOrderId;
      if (typeof expectedOrderId !== "string" || expectedOrderId.trim().length === 0) return;
      const tenantId = tenant.id;
      const tableId = table.id;
      void loadOpenOrderForTable(
        { authenticatedTenantId: tenantId },
        { tableId, expectedOrderId },
      ).then((order) => {
        if (!order) return;
        if (useOrderPaymentStore.getState().currentOrder !== null) return;
        if (useOrderPaymentStore.getState().selectOpenOrder(order)) {
          setSelectedTableId(tableId);
        }
      });
      return;
    }
    if (table.status !== "empty") return;
    if (!tenant || !staff) return;

    const now = Date.now();
    const orderId = `order-${id}-${now}-${Math.random().toString(36).slice(2, 9)}`;

    // Step 1: occupy the table first.
    const occupied = occupyTable(id, orderId, tenant.id);
    if (!occupied) return;

    // Step 2: create the open order.
    const created = createOpenOrder({
      id: orderId,
      tenantId: tenant.id,
      tableId: id,
      staffId: staff.id,
      status: "open",
      items: [],
      subtotal: 0,
      discount: 0,
      discountType: "amount",
      total: 0,
      createdAt: now,
    });

    if (!created) {
      // Rollback: return the table to empty.
      releaseTable(id, orderId);
      return;
    }

    setSelectedTableId(id);
    if (isDexiePersistSession()) {
      const table = useCatalogTableStore.getState().tableById(id);
      const order = useOrderPaymentStore.getState().currentOrder;
      if (table && order) void persistAfterOccupy({ authenticatedTenantId: tenant.id }, { table, order });
    }
  };

  /**
   * Pre-validation hook: called synchronously *before* recordPayment.
   * Verifies the table is releasable without mutating any store.
   * Returns false → abort payment; true → proceed.
   */
  const handleBeforePaymentConfirm = (): boolean => {
    if (!currentOrder) return false;
    const table = useCatalogTableStore.getState().tableById(currentOrder.tableId);
    if (!table) return false;
    return (
      (table.status === "occupied" || table.status === "waiting_payment") &&
      table.currentOrderId === currentOrder.id
    );
  };

  const handlePaymentSuccess = (): boolean => {
    const order = useOrderPaymentStore.getState().currentOrder;
    const released = Boolean(order && releaseTable(order.tableId, order.id));
    if (isDexiePersistSession() && order) {
      const table = useCatalogTableStore.getState().tableById(order.tableId);
      const payment = useOrderPaymentStore.getState().payments.find((entry) => entry.orderId === order.id);
      if (table && payment) {
        void persistAfterPay({ authenticatedTenantId: order.tenantId }, { table, order, payment });
      }
    }
    return released;
  };

  const handleReceiptClose = (): void => {
    clearCurrentOrder();
    setSelectedTableId(null);
  };

  // --- Panels ---

  const tablesPanel = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Danh sách bàn</h2>
        <div className="flex gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-success-foreground">
            <span className="h-2 w-2 rounded-full bg-success" />
            Trống
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-primary-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Có khách
          </span>
        </div>
      </div>
      <TableMap
        tables={tables}
        selectedTableId={selectedTableId}
        onSelect={(id) => handleTableSelect(id)}
      />
    </div>
  );

  const menuPanel = (
    <MenuGrid groups={catalogGroups} items={catalogItems} />
  );

  const orderPanel = <OrderPanel selectedTable={selectedTable} onBeforePaymentConfirm={handleBeforePaymentConfirm} onPaymentSuccess={handlePaymentSuccess} onReceiptClose={handleReceiptClose} />;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm sm:h-16 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Coffee className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-card-foreground sm:text-lg">
              CafePOS
            </h1>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              Quán ăn · Cafe nhỏ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
            <Clock className="h-4 w-4" />
            <span>10:30</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <User className="h-4 w-4" />
          </div>
        </div>
      </header>

      {/* Main navigation */}
      <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-card px-3 py-2 sm:px-6">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              type="button"
              aria-current={view === v.id ? "page" : undefined}
              onClick={() => setView(v.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                view === v.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {v.name}

            </button>
          );
        })}
      </nav>

      {view === "pos" ? (
        <>
          {/* Desktop layout */}
          <main className="hidden flex-1 gap-4 overflow-hidden p-4 lg:grid lg:grid-cols-12">
            <section className="col-span-3 flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
              {tablesPanel}
            </section>
            <section className="col-span-5 flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
              {menuPanel}
            </section>
            <section className="col-span-4 flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
              {orderPanel}
            </section>
          </main>

          {/* Mobile/Tablet layout */}
          <main className="flex flex-1 flex-col overflow-hidden p-3 lg:hidden">
            <Tabs defaultValue="tables" className="flex h-full flex-col">
              <TabsList className="grid w-full grid-cols-3 bg-secondary">
                <TabsTrigger value="tables" className="text-xs sm:text-sm">
                  Bàn
                </TabsTrigger>
                <TabsTrigger value="menu" className="text-xs sm:text-sm">
                  Thực đơn
                </TabsTrigger>
                <TabsTrigger value="order" className="text-xs sm:text-sm">
                  Đơn{" "}
                  {orderItemCount > 0 && (
                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {orderItemCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="tables"
                className="mt-3 flex-1 rounded-2xl border border-border bg-card p-3 shadow-sm data-[state=inactive]:hidden"
              >
                {tablesPanel}
              </TabsContent>
              <TabsContent
                value="menu"
                className="mt-3 flex-1 rounded-2xl border border-border bg-card p-3 shadow-sm data-[state=inactive]:hidden"
              >
                {menuPanel}
              </TabsContent>
              <TabsContent
                value="order"
                className="mt-3 flex-1 rounded-2xl border border-border bg-card p-3 shadow-sm data-[state=inactive]:hidden"
              >
                {orderPanel}
              </TabsContent>
            </Tabs>
          </main>
        </>
      ) : (
        <main className="flex flex-1 flex-col overflow-hidden p-3 sm:p-4">
          <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
            {view === "menu" && (
              <MenuManagement />
            )}
            {view === "report" && <ReportsPanel />}
            {view === "staff" && <StaffManagement />}
            {view === "kitchen" && (
              <KitchenPanel />
            )}
          </section>
        </main>
      )}

    </div>
  );
}


// --- Bootstrap gate ---
//
// ponytail: ephemeral demo verifier only; replace with approved bcrypt/cloud
// adapter at persistence/auth integration.

type BootstrapState = "loading" | "fatal" | "ready";

function App() {
  const [bootState, setBootState] = useState<BootstrapState>("loading");
  // Store the exact Tenant object reference returned by bootstrap.
  // isAuthenticated requires `tenant === bootTenant` (reference equality), so a
  // same-id impostor tenant injected via the store cannot pass the gate.
  const [bootTenant, setBootTenant] = useState<Tenant | null>(null);
  // Store the exact bootstrap-authenticated staff object reference, not just id.
  // isAuthenticated requires signedInStaff to be this exact object (reference equality),
  // so an external store replacement — even with a same-id impostor — cannot unlock the shell.
  const [authenticatedStaff, setAuthenticatedStaff] = useState<Staff | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const verifierRef = useRef<PinHashVerifier | null>(null);

  const { tenant, staff: signedInStaff, setTenant, signIn } = useTenantAuthStore();

  // Synchronous revocation boundary.
  // Zustand subscribe() fires synchronously inside set(), before React can batch
  // a follow-up setState into the same render. By counting revocations in a ref,
  // we capture signOut() before a same-object staff reinsert in the same act() batch
  // can unlock the gate — without relying on an async useEffect seeing null.
  const revokedCountRef = useRef<number>(0);
  const [authedAtRevCount, setAuthedAtRevCount] = useState<number | null>(null);

  // Subscribe once to watch for staff → null transitions (signOut / tenant change).
  // The subscriber runs synchronously during Zustand set(), so revokedCountRef is
  // already bumped before React flushes any batched updates.
  useEffect(() => {
    let prevStaff = useTenantAuthStore.getState().staff;
    const unsub = useTenantAuthStore.subscribe((state) => {
      if (prevStaff !== null && state.staff === null) {
        revokedCountRef.current += 1;
      }
      prevStaff = state.staff;
    });
    return unsub;
  }, []);

  // Clear local marker whenever the store session is revoked (e.g. signOut).
  // This prevents an external setState repopulation from bypassing the UI PIN gate.
  useEffect(() => {
    if (signedInStaff === null) {
      setAuthenticatedStaff(null);
    }
  }, [signedInStaff]);

  useEffect(() => {
    let cancelled = false;
    setAuthenticatedStaff(null);
    setDexiePersistSession(false);
    Promise.all([bootstrapDemoAuth(), bootstrapDemoPos()])
      .then(async ([{ tenant: t, staff: s, verifier: v }, pos]) => {
        if (cancelled) return;
        verifierRef.current = v;
        setTenant(t);
        setBootTenant(t);
        setStaffList(s);
        if (pos) {
          useCatalogTableStore.getState().replaceTenantData(t.id, pos);
          if (pos.currentOrder) useOrderPaymentStore.getState().selectOpenOrder(pos.currentOrder);
        } else {
          const hydrated = await hydrateFromDexie({ authenticatedTenantId: t.id });
          if (cancelled) return;
          if (hydrated) {
            useCatalogTableStore.getState().replaceTenantData(t.id, hydrated);
            setDexiePersistSession(true);
          }
        }
        setBootState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        verifierRef.current = null;
        setAuthenticatedStaff(null);
        setBootTenant(null);
        setStaffList([]);
        setTenant(null);
        setBootState("fatal");
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAuthenticated =
    bootState === "ready" &&
    bootTenant !== null &&
    tenant !== null &&
    signedInStaff !== null &&
    authenticatedStaff !== null &&
    // Reference equality: tenant must be the exact object returned by bootstrap —
    // a same-id impostor object injected via the store cannot pass this gate.
    tenant === bootTenant &&
    // Reference equality: signedInStaff must be the exact object returned by the bootstrap
    // PIN flow — not a same-id replacement injected from outside.
    signedInStaff === authenticatedStaff &&
    signedInStaff.tenantId === tenant.id &&
    // Revocation counter: revokedCountRef is incremented synchronously by the Zustand
    // subscriber whenever staff transitions to null (signOut/tenant change). If the
    // counter has advanced since sign-in, the session was revoked — even if the same
    // staff object was reinserted in the same batch before React re-rendered.
    authedAtRevCount !== null &&
    revokedCountRef.current === authedAtRevCount;

  async function handleSignIn(staffId: string, pin: string): Promise<boolean> {
    const verifier = verifierRef.current;
    if (!verifier) return false;
    const candidate = staffList.find((s) => s.id === staffId);
    if (!candidate || candidate.tenantId !== tenant?.id) return false;
    const ok = await signIn(pin, candidate, verifier);
    if (ok) {
      setAuthenticatedStaff(candidate);
      // Snapshot the revocation counter at the moment of successful sign-in.
      // isAuthenticated checks this against revokedCountRef; any subsequent
      // signOut() increments the ref synchronously, closing the gate.
      setAuthedAtRevCount(revokedCountRef.current);
    }
    return ok;
  }

  if (isAuthenticated) {
    return <PosShell />;
  }

  return (
    <PinLoginScreen
      state={bootState}
      staff={staffList}
      onSignIn={handleSignIn}
    />
  );
}

export default App;
