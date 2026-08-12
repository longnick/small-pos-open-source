import { useEffect, useMemo, useRef, useState } from "react";
import { bootstrapDemoAuth } from "@/auth/demo-auth-adapter";
import { PinLoginScreen } from "@/components/auth/PinLogin";
import { useTenantAuthStore } from "@/stores/tenant-auth-store";
import { useCatalogTableStore } from "@/stores/catalog-table-store";
import type { Staff, Tenant } from "../packages/pos-core/src/types";
import type { PinHashVerifier } from "../packages/pos-core/src/auth";
import {
  Coffee,
  Plus,
  Minus,
  Trash2,
  Receipt,
  ChefHat,
  Clock,
  User,
  Search,
  LayoutGrid,
  BookOpen,
  BarChart3,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { MenuManagement } from "@/components/pos/MenuManagement";
import { ReportsPanel } from "@/components/pos/ReportsPanel";
import { StaffManagement } from "@/components/pos/StaffManagement";
import { KitchenPanel } from "@/components/pos/KitchenPanel";
import { TableMap } from "@/components/pos/TableMap";
import {
  CATEGORIES,
  INITIAL_MENU_ITEMS,
  formatCurrency,
  type MenuItem,
} from "@/lib/pos";

const VIEWS = [
  { id: "pos", name: "Bán hàng", icon: LayoutGrid },
  { id: "kitchen", name: "Bếp", icon: ChefHat },
  { id: "menu", name: "Quản lý món", icon: BookOpen },
  { id: "report", name: "Báo cáo", icon: BarChart3 },
  { id: "staff", name: "Nhân sự", icon: Users },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

// --- Components ---

function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <Card className="group overflow-hidden border-border transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold text-foreground text-sm sm:text-base leading-tight">
              {item.name}
            </h4>
            {item.popular && (
              <Badge
                variant="secondary"
                className="mt-1 bg-accent text-accent-foreground text-[10px]"
              >
                Bán chạy
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="font-bold text-primary text-sm sm:text-base">
            {formatCurrency(item.price)}
          </span>
          <Button
            size="icon"
            className="h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-sm"
            onClick={() => undefined}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuantityButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors hover:bg-accent disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// --- Main Page (existing Lovable shell — do not modify) ---

function PosShell() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const tables = useCatalogTableStore((state) => state.tables);
  const [activeCategory, setActiveCategory] = useState<string>("coffee");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewId>("pos");

  // Clear selection when the selected table no longer exists in the store
  useEffect(() => {
    if (selectedTableId !== null && !tables.some((t) => t.id === selectedTableId)) {
      setSelectedTableId(null);
    }
  }, [tables, selectedTableId]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;
  const currentOrder = [
    { itemId: "c1", name: "Cà phê đen", price: 25000, quantity: 2, sentQty: 2 },
    { itemId: "f1", name: "Cơm gà", price: 55000, quantity: 1, note: "Ít cơm", sentQty: 1 },
  ];
  const filteredItems = useMemo(
    () => INITIAL_MENU_ITEMS.filter(
      (item) => item.category === activeCategory && item.available !== false && item.name.toLowerCase().includes(search.trim().toLowerCase()),
    ),
    [activeCategory, search],
  );
  const subtotal = currentOrder.reduce((sum, line) => sum + line.price * line.quantity, 0);

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
        onSelect={(id) => setSelectedTableId(id)}
      />
    </div>
  );

  const menuPanel = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-foreground">Thực đơn</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm món..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pb-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
              <Icon className="h-4 w-4" />
              {cat.name}
            </button>
          );
        })}
      </div>

      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">Không tìm thấy món nào</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const orderPanel = (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {selectedTable ? `Đơn ${selectedTable.number ? `Bàn ${selectedTable.number}` : selectedTable.id}` : "Đơn hàng"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {selectedTable ? `${currentOrder.length} món` : "Chưa chọn bàn"}
          </p>
        </div>
        {selectedTable && currentOrder.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => undefined}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Xóa đơn
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 -mx-1 px-1">
        {currentOrder.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Receipt className="mb-2 h-10 w-10 opacity-40" />
            <p className="text-sm">Chọn món để thêm vào đơn</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {currentOrder.map((line) => (
              <div
                key={line.itemId}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-card-foreground text-sm">
                    {line.name}
                  </p>
                  {(line.sentQty ?? 0) > 0 ? (
                    <Badge className="mt-0.5 bg-success/15 text-[10px] text-espresso">
                      Đã gửi bếp {line.sentQty}
                      {line.quantity > (line.sentQty ?? 0)
                        ? ` · mới ${line.quantity - (line.sentQty ?? 0)}`
                        : ""}
                    </Badge>
                  ) : (
                    <Badge className="mt-0.5 bg-warning/20 text-[10px] text-espresso">
                      Chưa gửi bếp
                    </Badge>
                  )}
                  {line.note && (
                    <p className="text-xs text-muted-foreground">{line.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(line.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <QuantityButton
                    onClick={() => undefined}
                    disabled={line.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </QuantityButton>
                  <span className="w-5 text-center text-sm font-semibold">
                    {line.quantity}
                  </span>
                  <QuantityButton
                    onClick={() => undefined}
                  >
                    <Plus className="h-3 w-3" />
                  </QuantityButton>
                  <button
                    onClick={() => undefined}
                    className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <Separator className="my-3" />

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tạm tính</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Tổng cộng</span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(subtotal)}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          className="h-12 text-sm font-semibold"
          disabled
          onClick={() => undefined}
        >
          <ChefHat className="mr-2 h-4 w-4" />
          Gửi bếp
        </Button>
        <Button
          className="h-12 bg-primary text-sm font-semibold text-primary-foreground shadow-sm"
          disabled
          onClick={() => undefined}
        >
          <Receipt className="mr-2 h-4 w-4" />
          Thanh toán
        </Button>
      </div>
    </div>
  );

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
              onClick={() => setView(v.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                view === v.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Icon className="h-4 w-4" />
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
                  {currentOrder.length > 0 && (
                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {currentOrder.length}
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
    bootstrapDemoAuth()
      .then(({ tenant: t, staff: s, verifier: v }) => {
        if (cancelled) return;
        verifierRef.current = v;
        setTenant(t);
        setBootTenant(t);
        setStaffList(s);
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
