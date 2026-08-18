import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Staff, Tenant } from "../packages/pos-core/src/types";
import type { PinHashVerifier } from "../packages/pos-core/src/auth";
import type { ProductBootstrap } from "./pos/product-bootstrap";
import type { DexieHydrateResult } from "./pos/dexie-hydrate";
import { isDexiePersistSession, setDexiePersistSession } from "./pos/dexie-persist";
import { useTenantAuthStore } from "./stores/tenant-auth-store";
import { useCatalogTableStore } from "./stores/catalog-table-store";
import { useOrderPaymentStore } from "./stores/order-payment-store";

// ---------------------------------------------------------------------------
// Hoisted mock — per-test implementation via mockImplementation
// ---------------------------------------------------------------------------

const bootstrap = vi.hoisted(() => {
  return {
    create: vi.fn<() => Promise<ProductBootstrap>>(
      () => new Promise<ProductBootstrap>(() => {}),
    ),
  };
});

const setup = vi.hoisted(() => ({
  complete: vi.fn(async () => ({ ok: false as const })),
}));

const hydrate = vi.hoisted(() => ({
  fromDexie: vi.fn(async (_input?: { authenticatedTenantId: string }): Promise<DexieHydrateResult | null> => null),
}));

const persist = vi.hoisted(() => ({
  occupy: vi.fn(async () => true),
  pay: vi.fn(async (): Promise<{ kind: "committed" | "idempotent" | "conflict" | "io-error" | "invalid" }> => ({ kind: "committed" })),
  loadPay: vi.fn(async () => null as null | {
    kind: "ok" | "corrupt";
    table?: import("../packages/pos-core/src/types").PosTable;
    order?: import("../packages/pos-core/src/types").Order | null;
    payments?: import("../packages/pos-core/src/types").Payment[];
    audits?: import("../packages/pos-core/src/types").AuditEntry[];
  }),
}));

const restore = vi.hoisted(() => ({
  load: vi.fn(async () => null as { order: import("../packages/pos-core/src/types").Order; audits: import("../packages/pos-core/src/types").AuditEntry[] } | null),
}));

const backup = vi.hoisted(() => ({
  exportBackup: vi.fn(async () => null as string | null),
  importBackup: vi.fn(async () => false as const),
}));

const tabs = vi.hoisted(() => ({
  listen: vi.fn<(handler: (event: { tenantId: string; kind: "occupy" | "edit" | "pay" }) => void) => () => void>(
    () => () => undefined,
  ),
}));

const posBoot = vi.hoisted(() => ({
  create: vi.fn<typeof import("./pos/demo-pos-bootstrap").bootstrapDemoPos>(async () => null),
}));

vi.mock("@/pos/product-bootstrap", () => ({
  loadProductBootstrap: bootstrap.create,
}));

vi.mock("@/pos/product-setup", () => ({
  completeFirstRun: setup.complete,
}));

vi.mock("@/pos/dexie-hydrate", () => ({
  hydrateFromDexie: hydrate.fromDexie,
}));

vi.mock("@/pos/dexie-persist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./pos/dexie-persist")>();
  return {
    ...actual,
    persistAfterOccupy: persist.occupy,
    persistAfterPay: persist.pay,
    loadDurablePaySnapshot: persist.loadPay,
  };
});

vi.mock("@/pos/dexie-restore", () => ({
  loadRestoredOrderForTable: restore.load,
  loadOpenOrderForTable: async (...args: unknown[]) => {
    const restored = await restore.load(...args as []);
    return restored?.order ?? null;
  },
}));

vi.mock("@/pos/dexie-backup", () => ({
  exportDexieBackup: backup.exportBackup,
  importDexieBackup: backup.importBackup,
  importDexieRecoveryBackup: backup.importBackup,
}));

vi.mock("@/pos/dexie-tabs", () => ({
  listenDexieTabEvents: tabs.listen,
}));

vi.mock("@/pos/demo-pos-bootstrap", () => ({
  bootstrapDemoPos: posBoot.create,
}));

import App from "./App";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const tenant: Tenant = {
  id: "tenant-demo",
  name: "Quán Demo",
  address: "1 Demo Street",
  phone: "0912345678",
  currency: "VND",
  defaultTax: 0,
  defaultSurcharge: 0,
  tableCount: 5,
  createdAt: 0,
};

const staffRecord: Staff = {
  id: "manager",
  tenantId: tenant.id,
  name: "Manager",
  role: "manager",
  // Syntactically valid v1 hash — acceptAllVerifier bypasses real PBKDF2
  pinHash: "v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  createdAt: 0,
};

/** Mock verifier that accepts any PIN — skips PBKDF2 in tests. */
const acceptAllVerifier: PinHashVerifier = async () => true;

function makeReadyBootstrap(extra?: {
  catalogGroups?: DexieHydrateResult["catalogGroups"];
  catalogItems?: DexieHydrateResult["catalogItems"];
  tables?: DexieHydrateResult["tables"];
  persistable?: boolean;
}): Promise<ProductBootstrap> {
  return Promise.resolve({
    kind: "ready",
    tenant,
    staff: [staffRecord],
    catalogGroups: extra?.catalogGroups ?? [],
    catalogItems: extra?.catalogItems ?? [],
    tables: extra?.tables ?? [],
    verifier: acceptAllVerifier,
    persistable: extra?.persistable === true,
  });
}

// ---------------------------------------------------------------------------
// Helper: simulate the sign-in flow via fireEvent
// ---------------------------------------------------------------------------

async function signInViaUI(staffId: string, pin: string) {
  // Select staff from the combobox
  const select = screen.getByRole("combobox");
  fireEvent.change(select, { target: { value: staffId } });

  // Enter PIN in the password field
  const pinInput = screen.getByLabelText("PIN");
  fireEvent.change(pinInput, { target: { value: pin } });

  // Click the login button
  const submitBtn = screen.getByRole("button", { name: /đăng nhập/i });
  await act(async () => {
    fireEvent.click(submitBtn);
  });
}

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

beforeEach(() => {
  setDexiePersistSession(false);
  useTenantAuthStore.setState({ tenant: null, staff: null });
  useCatalogTableStore.setState({ tenantId: null, catalogGroups: [], catalogItems: [], tables: [] });
  useOrderPaymentStore.getState().clearCurrentOrder();
  useOrderPaymentStore.setState({ payments: Object.freeze([]) as never, auditEntries: [], lastReceipt: null });
  bootstrap.create.mockClear();
  hydrate.fromDexie.mockClear();
  hydrate.fromDexie.mockImplementation(async () => null);
  persist.occupy.mockClear();
  persist.pay.mockClear();
  persist.occupy.mockImplementation(async () => true);
  persist.pay.mockImplementation(async () => ({ kind: "committed" as const }));
  persist.loadPay.mockClear();
  persist.loadPay.mockImplementation(async () => null);
  restore.load.mockClear();
  restore.load.mockImplementation(async () => null);
  backup.exportBackup.mockClear();
  backup.importBackup.mockClear();
  backup.exportBackup.mockImplementation(async () => null);
  backup.importBackup.mockImplementation(async () => false);
  tabs.listen.mockClear();
  tabs.listen.mockImplementation(() => () => undefined);
  posBoot.create.mockClear();
  posBoot.create.mockImplementation(async () => null);
  // Default: bootstrap never resolves (pending forever)
  setup.complete.mockClear();
  setup.complete.mockImplementation(async () => ({ ok: false }));
  bootstrap.create.mockImplementation(() => new Promise<ProductBootstrap>(() => {}));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("bootstrap pending: CafePOS shell is absent, loading indicator shown", () => {
  render(<App />);

  expect(screen.getByRole("status")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull();
});

test("empty product bootstrap shows first-run wizard, not demo login", async () => {
  bootstrap.create.mockImplementation(async () => ({ kind: "needs-setup" }));
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Thiết lập quán" })).toBeTruthy());
  expect(screen.queryByRole("heading", { name: "Đăng nhập" })).toBeNull();
  expect(screen.queryByText("Quán Demo")).toBeNull();
  expect(screen.queryByText("0000")).toBeNull();
});

test("corrupt product bootstrap shows recovery, not demo PIN", async () => {
  bootstrap.create.mockImplementation(async () => ({ kind: "corrupt" }));
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Không thể đọc dữ liệu quán" })).toBeTruthy());
  expect(screen.queryByRole("heading", { name: "Đăng nhập" })).toBeNull();
  expect(screen.queryByText("0000")).toBeNull();
});

test("bootstrap failure/fatal: CafePOS shell is absent, error alert shown", async () => {
  bootstrap.create.mockImplementation(() =>
    Promise.reject(new Error("network error"))
  );

  render(<App />);

  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull();
});

test("bootstrap ready with no staff session: CafePOS shell is absent, login form shown", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull();
});

test("stale store session before bootstrap: pre-seeded tenant+staff do not grant CafePOS shell", () => {
  // Simulate leftover Zustand state from a previous session
  useTenantAuthStore.setState({ tenant, staff: staffRecord });

  // Bootstrap is still pending (default mock)
  render(<App />);

  // The local-state guard (authenticatedStaffId === null) must block the shell
  expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull();
  expect(screen.getByRole("status")).toBeTruthy();
});

test("tenant/staff tenantId mismatch: CafePOS shell is absent", async () => {
  const mismatchedStaff: Staff = { ...staffRecord, tenantId: "other-tenant" };

  bootstrap.create.mockImplementation(() =>
    Promise.resolve({
      kind: "ready",
      tenant,
      staff: [mismatchedStaff],
      catalogGroups: [],
      catalogItems: [],
      tables: [],
      verifier: acceptAllVerifier,
      persistable: false,
    })
  );

  render(<App />);

  // Bootstrap resolved — login form appears
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );

  // Attempt sign-in: handleSignIn rejects because candidate.tenantId !== tenant.id
  await signInViaUI(mismatchedStaff.id, "1234");

  // Shell must NOT appear
  expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull();
});

test("successful signIn through UI: CafePOS shell appears", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );

  await signInViaUI(staffRecord.id, "7890");

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );
});

test("signOut returns to non-shell boundary: CafePOS shell disappears", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );

  await signInViaUI(staffRecord.id, "7890");

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // Drive sign-out via the store (no sign-out button in the shell UI yet)
  act(() => {
    useTenantAuthStore.getState().signOut();
  });

  await waitFor(() =>
    expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull()
  );
  expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy();
});

test("signOut then external store repopulation: shell must not reappear without new UI sign-in", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  render(<App />);

  // Sign in via real UI
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // Sign out via the store
  act(() => {
    useTenantAuthStore.getState().signOut();
  });
  await waitFor(() =>
    expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull()
  );

  // Adversary: repopulate the store with the same tenant + staff directly,
  // bypassing UI PIN — should NOT restore the shell
  act(() => {
    useTenantAuthStore.setState({ tenant, staff: staffRecord });
  });

  // Shell must stay absent — no new UI sign-in occurred
  await waitFor(() =>
    expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull()
  );
  expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy();
});

test("UI sign-in staff A then store replacement with staff B same tenant: shell absent", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  render(<App />);

  // Sign in as staffRecord (staff A) via real UI
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // Adversary: replace signedInStaff in the store with a crafted staff B that
  // shares the same id (so authenticatedStaffId marker still "matches") but is a
  // different object — not the bootstrap-authenticated record.
  // This simulates an external/store-level injection while the marker persists.
  const staffB: Staff = {
    ...staffRecord,
    // same id — the existing id-equality check would PASS for this
    id: staffRecord.id,
    name: "Intruder B",
    role: "manager",
    pinHash: "v1$BBBBBBBBBBBBBBBBBBBBBB==$BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
  };
  act(() => {
    useTenantAuthStore.setState({ staff: staffB });
  });

  // Shell must be absent — staffB is not the bootstrap-authenticated record,
  // even though its id matches authenticatedStaffId
  await waitFor(() =>
    expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull()
  );
  expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy();
});

// ---------------------------------------------------------------------------
// Regression 1: same-ID tenant object replacement must not unlock the shell
// ---------------------------------------------------------------------------

test("regression: UI sign-in then same-id tenant object replacement — shell must remain absent", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  render(<App />);

  // Sign in via real UI
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // Adversary: replace the tenant with a *new object* that has the same id —
  // tenant.id === bootTenantId would still pass, but tenant !== bootTenant should fail.
  const impostorTenant: Tenant = { ...tenant, name: "Impostor Corp" };
  act(() => {
    useTenantAuthStore.setState({ tenant: impostorTenant });
  });

  // Shell must be absent — impostor tenant is not the bootstrap-authenticated reference
  await waitFor(() =>
    expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull()
  );
  expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy();
});

// ---------------------------------------------------------------------------
// Regression 2: synchronous signOut + same-object reinsert must not unlock shell
// ---------------------------------------------------------------------------

test("regression: signOut then synchronous same-object staff reinsert — shell must remain absent", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  render(<App />);

  // Sign in via real UI
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // Adversary: signOut() then immediately reinsert the exact same staff object
  // in a single act() batch — no intermediate null render occurs, so the
  // useEffect-based guard alone cannot clear authenticatedStaff before the
  // reinsert. The synchronous revocation boundary must block this.
  act(() => {
    useTenantAuthStore.getState().signOut();
    useTenantAuthStore.setState({ staff: staffRecord });
  });

  // Shell must be absent — signOut revoked the session generation
  await waitFor(() =>
    expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull()
  );
  expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy();
});

test("remount after signOut: fresh mount starts at non-shell boundary", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  const { unmount } = render(<App />);

  // Sign in
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // Sign out and unmount
  act(() => {
    useTenantAuthStore.getState().signOut();
  });
  unmount();

  // Remount — App's local authenticatedStaffId resets to null on mount
  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  expect(screen.queryByRole("heading", { name: "CafePOS" })).toBeNull();
});

// ---------------------------------------------------------------------------
// Task 2.7 Slice 2 — catalog store as sole POS menu source (MenuGrid)
// ---------------------------------------------------------------------------

test("authenticated POS menu: store groups/items appear; unavailable item absent; replacing store clears stale data", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // Inject catalog data via replaceTenantData (test-only act)
  act(() => {
    useCatalogTableStore.getState().replaceTenantData(tenant.id, {
      catalogGroups: [
        { id: "g1", tenantId: tenant.id, name: "Cà phê", sortOrder: 1 },
        { id: "g2", tenantId: tenant.id, name: "Trà sữa", sortOrder: 2 },
      ],
      catalogItems: [
        {
          id: "ci1", tenantId: tenant.id, groupId: "g1",
          name: "Espresso đặc", price: 30000, available: true,
          sortOrder: 1, createdAt: 0, updatedAt: 0,
        },
        {
          id: "ci2", tenantId: tenant.id, groupId: "g1",
          name: "Món hết hàng", price: 20000, available: false,
          sortOrder: 2, createdAt: 0, updatedAt: 0,
        },
        {
          id: "ci3", tenantId: tenant.id, groupId: "g2",
          name: "Trà sữa trân châu", price: 40000, available: true,
          sortOrder: 1, createdAt: 0, updatedAt: 0,
        },
      ],
      tables: [],
    });
  });

  // Store group and item names must appear in the menu area
  await waitFor(() =>
    expect(screen.getAllByText("Cà phê").length).toBeGreaterThan(0)
  );
  expect(screen.getAllByText("Espresso đặc").length).toBeGreaterThan(0);

  // Unavailable item must NOT appear
  expect(screen.queryByText("Món hết hàng")).toBeNull();

  // Now replace: remove the "Cà phê" group entirely
  act(() => {
    useCatalogTableStore.getState().replaceTenantData(tenant.id, {
      catalogGroups: [
        { id: "g2", tenantId: tenant.id, name: "Trà sữa", sortOrder: 2 },
      ],
      catalogItems: [
        {
          id: "ci3", tenantId: tenant.id, groupId: "g2",
          name: "Trà sữa trân châu", price: 40000, available: true,
          sortOrder: 1, createdAt: 0, updatedAt: 0,
        },
      ],
      tables: [],
    });
  });

  // Stale group pill and its items must vanish; reconcile resets active group
  await waitFor(() =>
    expect(screen.queryByText("Espresso đặc")).toBeNull()
  );
  // The remaining group must still render
  expect(screen.getAllByText("Trà sữa trân châu").length).toBeGreaterThan(0);
});

test("authenticated POS menu empty store: exact text 'Chưa có món để hiển thị' appears", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);
  // catalog store is empty (cleared in beforeEach)

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // With no catalog groups, MenuGrid must show the empty-state text
  expect(screen.getAllByText("Chưa có món để hiển thị").length).toBeGreaterThan(0);
});

test("authenticated shell with empty catalog-table store: shows empty state text and no Bàn 1 card", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);
  // catalog-table store is empty (cleared in beforeEach)

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // Must show exact empty-state text (desktop + mobile layouts each render once)
  expect(screen.getAllByText("Chưa có bàn để hiển thị").length).toBeGreaterThan(0);
  // Must NOT show any Bàn 1 table card
  expect(screen.queryByRole("button", { name: /Bàn 1/i })).toBeNull();
});

test("authenticated shell: select Bàn 2 then replace store omitting its ID — selection clears and stale Bàn 2 does not remain", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  const baseTables = [
    {
      id: "t1",
      tenantId: tenant.id,
      number: 1,
      status: "empty" as const,
      openedAt: 0,
      staffId: "s1",
    },
    {
      id: "t2",
      tenantId: tenant.id,
      number: 2,
      status: "empty" as const,
      openedAt: 0,
      staffId: "s1",
    },
  ];

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // Load two tables into the catalog store
  act(() => {
    useCatalogTableStore.getState().replaceTenantData(tenant.id, {
      catalogGroups: [],
      catalogItems: [],
      tables: baseTables,
    });
  });

  // Bàn 2 should now be visible (desktop + mobile layouts); click the first one to select
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: /Bàn 2/i }).length).toBeGreaterThan(0)
  );
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 2/i })[0]);

  // Replace store with only Bàn 1 (omitting t2 / Bàn 2)
  act(() => {
    useCatalogTableStore.getState().replaceTenantData(tenant.id, {
      catalogGroups: [],
      catalogItems: [],
      tables: [baseTables[0]],
    });
  });

  await waitFor(() =>
    expect(screen.queryByRole("button", { name: /Bàn 2/i })).toBeNull()
  );

  // Selection must have cleared — no stale Bàn 2 state in the order panel
  // (order panel is neutral / presentation-only when nothing is selected)
  expect(screen.queryByText(/Đơn Bàn 2/)).toBeNull();
});

// ---------------------------------------------------------------------------
// Task 2.8 Slice 2 — OrderPanel wired into PosShell
// ---------------------------------------------------------------------------

test("2.8-s2: authenticated shell with null order state: shows 'Chọn món để thêm vào đơn', no fake line items, Gửi bếp/Thanh toán disabled", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);
  // order-payment store is cleared in beforeEach (currentOrder = null)

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // Empty-state text must be present (desktop + mobile panels both render)
  expect(screen.getAllByText("Chọn món để thêm vào đơn").length).toBeGreaterThan(0);

  // Hard-coded fake line items must be absent
  expect(screen.queryByText("Cà phê đen")).toBeNull();
  expect(screen.queryByText("Cơm gà")).toBeNull();
  expect(screen.queryByText("Ít cơm")).toBeNull();

  // Action buttons disabled (both desktop + mobile panels each render one pair)
  const guiBep = screen.getAllByRole("button", { name: /Gửi bếp/i });
  const thanhToan = screen.getAllByRole("button", { name: /Thanh toán/i });
  expect(guiBep.length).toBeGreaterThan(0);
  expect(thanhToan.length).toBeGreaterThan(0);
  guiBep.forEach((btn) => expect(btn).toBeDisabled());
  thanhToan.forEach((btn) => expect(btn).toBeDisabled());
});

// ---------------------------------------------------------------------------
// Task 2.9 Slice 3 — payment safe boundary (null order, UI sign-in only)
// ---------------------------------------------------------------------------

test("2.9-s3: authenticated shell with null order — Thanh toán disabled and no dialog named Thanh toán", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);
  // order-payment store is cleared in beforeEach (currentOrder = null)

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  // All "Thanh toán" buttons must be disabled (desktop + mobile panels both render one each)
  const thanhToanBtns = screen.getAllByRole("button", { name: /Thanh toán/i });
  expect(thanhToanBtns.length).toBeGreaterThan(0);
  thanhToanBtns.forEach((btn) => expect(btn).toBeDisabled());

  // No accessible dialog named "Thanh toán" must exist in the DOM
  expect(screen.queryByRole("dialog", { name: "Thanh toán" })).toBeNull();
});

test("authenticated shell nav: default view 'Bán hàng' is current; siblings are not", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  const pos = screen.getByRole("button", { name: "Bán hàng" });
  expect(pos).toHaveAttribute("aria-current", "page");
  expect(pos).toHaveAttribute("type", "button");
  expect(screen.getByRole("button", { name: "Bếp" })).not.toHaveAttribute(
    "aria-current",
  );
  expect(screen.getByRole("button", { name: "Quản lý món" })).not.toHaveAttribute(
    "aria-current",
  );
  expect(screen.getByRole("button", { name: "Báo cáo" })).not.toHaveAttribute(
    "aria-current",
  );
  expect(screen.getByRole("button", { name: "Nhân sự" })).not.toHaveAttribute(
    "aria-current",
  );
  expect(screen.getByRole("button", { name: "Sao lưu" })).not.toHaveAttribute(
    "aria-current",
  );
});

test("authenticated shell nav: clicking 'Bếp' marks only that view current", async () => {
  bootstrap.create.mockImplementation(makeReadyBootstrap);

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy()
  );

  fireEvent.click(screen.getByRole("button", { name: "Bếp" }));
  expect(screen.getByRole("button", { name: "Bếp" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("button", { name: "Bán hàng" })).not.toHaveAttribute(
    "aria-current",
  );
});

test("production pos null: hydrates catalog/tables from Dexie and leaves currentOrder null", async () => {
  const catalogGroups = [{ id: "g1", tenantId: tenant.id, name: "Cà phê", sortOrder: 1 }];
  const catalogItems = [{
    id: "ci1",
    tenantId: tenant.id,
    groupId: "g1",
    name: "Cà phê đen",
    price: 25_000,
    available: true,
    sortOrder: 1,
    createdAt: 0,
    updatedAt: 0,
  }];
  const tables = [{
    id: "t1",
    tenantId: tenant.id,
    number: 1,
    status: "empty" as const,
    openedAt: 0,
    staffId: staffRecord.id,
  }];
  bootstrap.create.mockImplementation(() =>
    makeReadyBootstrap({ catalogGroups, catalogItems, tables, persistable: true }),
  );

  render(<App />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy()
  );
  expect(useCatalogTableStore.getState()).toMatchObject({
    tenantId: tenant.id,
    catalogGroups,
    catalogItems,
    tables,
  });
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
});

test("hydrate success enables occupy persist; empty IDB and E2E fixture never call persist", async () => {
  const catalogGroups = [{ id: "g1", tenantId: tenant.id, name: "Cà phê", sortOrder: 1 }];
  const catalogItems = [{
    id: "ci1",
    tenantId: tenant.id,
    groupId: "g1",
    name: "Cà phê đen",
    price: 25_000,
    available: true,
    sortOrder: 1,
    createdAt: 0,
    updatedAt: 0,
  }];
  const tables = [{
    id: "t1",
    tenantId: tenant.id,
    number: 1,
    status: "empty" as const,
    openedAt: 0,
    staffId: staffRecord.id,
  }];
  bootstrap.create.mockImplementation(() =>
    makeReadyBootstrap({ catalogGroups, catalogItems, tables, persistable: true }),
  );
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  expect(isDexiePersistSession()).toBe(true);
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  await waitFor(() => expect(persist.occupy).toHaveBeenCalledTimes(1));
  expect(useOrderPaymentStore.getState().currentOrder?.tableId).toBe("t1");
});

test("empty hydrate does not persist occupy", async () => {
  bootstrap.create.mockImplementation(() => makeReadyBootstrap({ persistable: false }));
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  expect(isDexiePersistSession()).toBe(false);
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  act(() => {
    useCatalogTableStore.getState().replaceTenantData(tenant.id, {
      catalogGroups: [],
      catalogItems: [],
      tables: [{
        id: "t1",
        tenantId: tenant.id,
        number: 1,
        status: "empty",
        openedAt: 0,
        staffId: staffRecord.id,
      }],
    });
  });
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  expect(persist.occupy).not.toHaveBeenCalled();
});

test("E2E fixture pos skips persist even when occupy succeeds", async () => {
  posBoot.create.mockImplementation(async () => ({
    catalogGroups: [],
    catalogItems: [],
    tables: [{
      id: "t1",
      tenantId: tenant.id,
      number: 1,
      status: "empty" as const,
      openedAt: 0,
      staffId: staffRecord.id,
    }],
    currentOrder: null,
  }));
  bootstrap.create.mockImplementation(makeReadyBootstrap);
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  expect(isDexiePersistSession()).toBe(false);
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  expect(persist.occupy).not.toHaveBeenCalled();
  expect(restore.load).not.toHaveBeenCalled();
});

const occupiedHydrate = {
  catalogGroups: [{ id: "g1", tenantId: tenant.id, name: "Cà phê", sortOrder: 1 }],
  catalogItems: [{
    id: "ci1",
    tenantId: tenant.id,
    groupId: "g1",
    name: "Cà phê đen",
    price: 25_000,
    available: true,
    sortOrder: 1,
    createdAt: 0,
    updatedAt: 0,
  }],
  tables: [{
    id: "t1",
    tenantId: tenant.id,
    number: 1,
    status: "occupied" as const,
    openedAt: 0,
    staffId: staffRecord.id,
    currentOrderId: "order-1",
  }],
};

const restoredOrder = {
  id: "order-1",
  tenantId: tenant.id,
  tableId: "t1",
  staffId: staffRecord.id,
  status: "open" as const,
  items: [],
  subtotal: 0,
  discount: 0,
  discountType: "amount" as const,
  total: 0,
  createdAt: 1,
};

test("hydrate success + occupied table click restores the bound open order", async () => {
  restore.load.mockImplementation(async () => ({ order: restoredOrder, audits: [] }));
  bootstrap.create.mockImplementation(() =>
    makeReadyBootstrap({ ...occupiedHydrate, persistable: true }),
  );
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  expect(isDexiePersistSession()).toBe(true);
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  await waitFor(() => expect(restore.load).toHaveBeenCalledTimes(1));
  expect(restore.load).toHaveBeenCalledWith(
    { authenticatedTenantId: tenant.id },
    { tableId: "t1", expectedOrderId: "order-1" },
  );
  await waitFor(() => expect(useOrderPaymentStore.getState().currentOrder?.id).toBe("order-1"));
  expect(persist.occupy).not.toHaveBeenCalled();
  expect(screen.getAllByRole("button", { name: /Bàn 1/i })[0].getAttribute("aria-pressed")).toBe("true");
});

test("occupied restore after logout/relogin does not mutate the new session", async () => {
  let resolveRestore!: (value: { order: typeof restoredOrder; audits: [] }) => void;
  restore.load.mockImplementation(() => new Promise((resolve) => { resolveRestore = resolve; }));
  bootstrap.create.mockImplementation(() =>
    makeReadyBootstrap({ ...occupiedHydrate, persistable: true }),
  );
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  await waitFor(() => expect(restore.load).toHaveBeenCalledTimes(1));
  useTenantAuthStore.getState().signOut();
  await useTenantAuthStore.getState().signIn("7890", staffRecord, acceptAllVerifier);
  await act(async () => { resolveRestore({ order: restoredOrder, audits: [] }); });
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
});

test("occupied restore after table rebind during await does not apply the old order", async () => {
  let resolveRestore!: (value: { order: typeof restoredOrder; audits: [] }) => void;
  restore.load.mockImplementation(() => new Promise((resolve) => { resolveRestore = resolve; }));
  bootstrap.create.mockImplementation(() =>
    makeReadyBootstrap({ ...occupiedHydrate, persistable: true }),
  );
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  await waitFor(() => expect(restore.load).toHaveBeenCalledTimes(1));
  act(() => {
    useCatalogTableStore.setState({
      tables: [{ ...occupiedHydrate.tables[0], currentOrderId: "order-other" }],
    });
  });
  await act(async () => { resolveRestore({ order: restoredOrder, audits: [] }); });
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
});

test("occupied restore after staffId change during await does not apply", async () => {
  let resolveRestore!: (value: { order: typeof restoredOrder; audits: [] }) => void;
  restore.load.mockImplementation(() => new Promise((resolve) => { resolveRestore = resolve; }));
  bootstrap.create.mockImplementation(() =>
    makeReadyBootstrap({ ...occupiedHydrate, persistable: true }),
  );
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  await waitFor(() => expect(restore.load).toHaveBeenCalledTimes(1));
  act(() => {
    useCatalogTableStore.setState({
      tables: [{ ...occupiedHydrate.tables[0], staffId: "staff-other" }],
    });
  });
  await act(async () => { resolveRestore({ order: restoredOrder, audits: [] }); });
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
});

test("occupied click with missing currentOrderId does not call restore", async () => {
  bootstrap.create.mockImplementation(() =>
    makeReadyBootstrap({
      ...occupiedHydrate,
      tables: [{ ...occupiedHydrate.tables[0], currentOrderId: undefined }],
      persistable: true,
    }),
  );
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  expect(restore.load).not.toHaveBeenCalled();
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
  expect(screen.getAllByRole("button", { name: /Bàn 1/i })[0].getAttribute("aria-pressed")).toBe("false");
});

test("empty IDB never calls restore on occupied click", async () => {
  bootstrap.create.mockImplementation(() => makeReadyBootstrap({ persistable: false }));
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  expect(isDexiePersistSession()).toBe(false);
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  act(() => {
    useCatalogTableStore.getState().replaceTenantData(tenant.id, {
      catalogGroups: [],
      catalogItems: [],
      tables: occupiedHydrate.tables,
    });
  });
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  expect(restore.load).not.toHaveBeenCalled();
  expect(useOrderPaymentStore.getState().currentOrder).toBeNull();
});

test("existing currentOrder + other occupied table only changes highlight", async () => {
  restore.load.mockImplementation(async () => ({ order: restoredOrder, audits: [] }));
  bootstrap.create.mockImplementation(() =>
    makeReadyBootstrap({
      ...occupiedHydrate,
      tables: [
        occupiedHydrate.tables[0],
        {
          id: "t2",
          tenantId: tenant.id,
          number: 2,
          status: "occupied" as const,
          openedAt: 0,
          staffId: staffRecord.id,
          currentOrderId: "order-2",
        },
      ],
      persistable: true,
    }),
  );
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  await waitFor(() => expect(useOrderPaymentStore.getState().currentOrder?.id).toBe("order-1"));
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 2/i })[0]);
  expect(restore.load).toHaveBeenCalledTimes(1);
  expect(useOrderPaymentStore.getState().currentOrder?.id).toBe("order-1");
  expect(screen.getAllByRole("button", { name: /Bàn 2/i })[0].getAttribute("aria-pressed")).toBe("true");
});

test("hydrate success enables backup export; empty IDB disables it", async () => {
  bootstrap.create.mockImplementation(() =>
    makeReadyBootstrap({ ...occupiedHydrate, persistable: true }),
  );
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Sao lưu" }));
  expect(screen.getByRole("heading", { name: "Sao lưu dữ liệu" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Tải sao lưu" })).toBeEnabled();
});

test("empty IDB backup actions stay disabled", async () => {
  bootstrap.create.mockImplementation(() => makeReadyBootstrap({ persistable: false }));
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Sao lưu" }));
  expect(screen.getByRole("button", { name: "Tải sao lưu" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Nhập sao lưu" })).toBeDisabled();
  expect(backup.exportBackup).not.toHaveBeenCalled();
});

test("tab listener ignores events until persist session is on", async () => {
  let onEvent: ((event: { tenantId: string; kind: "occupy" | "edit" | "pay" }) => void) | null = null;
  tabs.listen.mockImplementation((handler) => {
    onEvent = handler;
    return () => undefined;
  });
  bootstrap.create.mockImplementation(() => makeReadyBootstrap({ persistable: false }));
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  expect(isDexiePersistSession()).toBe(false);
  expect(tabs.listen).toHaveBeenCalled();
  hydrate.fromDexie.mockClear();
  await act(async () => {
    onEvent?.({ tenantId: tenant.id, kind: "pay" });
  });
  expect(hydrate.fromDexie).not.toHaveBeenCalled();
});

test("other-tab persist event rehydrates catalog/tables for the same tenant", async () => {
  let onEvent: ((event: { tenantId: string; kind: "occupy" | "edit" | "pay" }) => void) | null = null;
  tabs.listen.mockImplementation((handler) => {
    onEvent = handler;
    return () => undefined;
  });
  bootstrap.create.mockImplementation(() =>
    makeReadyBootstrap({ ...occupiedHydrate, persistable: true }),
  );
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  expect(tabs.listen).toHaveBeenCalled();
  hydrate.fromDexie.mockImplementation(async () => ({
    ...occupiedHydrate,
    tables: [{ ...occupiedHydrate.tables[0], status: "empty" as const, currentOrderId: undefined }],
  }));
  useOrderPaymentStore.getState().selectOpenOrder(restoredOrder);
  await act(async () => {
    onEvent?.({ tenantId: tenant.id, kind: "pay" });
  });
  await waitFor(() => expect(useCatalogTableStore.getState().tables[0]?.status).toBe("empty"));
  expect(useCatalogTableStore.getState().tables[0]?.currentOrderId).toBeUndefined();
  expect(useOrderPaymentStore.getState().currentOrder?.id).toBe("order-1");
});

const payOpenOrder = {
  id: "order-1",
  tenantId: tenant.id,
  tableId: "t1",
  staffId: staffRecord.id,
  status: "open" as const,
  items: [{
    id: "line-1",
    orderId: "order-1",
    catalogItemId: "ci1",
    name: "Cà phê đen",
    price: 25_000,
    quantity: 1,
  }],
  subtotal: 25_000,
  discount: 0,
  discountType: "amount" as const,
  total: 25_000,
  createdAt: 1,
};

const winnerPayment = {
  id: "pay-win",
  tenantId: tenant.id,
  orderId: "order-1",
  amount: 25_000,
  tender: 25_000,
  method: "cash" as const,
  staffId: staffRecord.id,
  createdAt: 20,
};

const winnerAudit = {
  id: "payment:pay-win",
  tenantId: tenant.id,
  staffId: staffRecord.id,
  action: "payment.recorded",
  entityType: "order",
  entityId: "order-1",
  details: { paymentId: "pay-win", method: "cash", paidTotal: 25_000, tender: 25_000, change: 0 },
  timestamp: 20,
};

async function openPayModal() {
  restore.load.mockImplementation(async () => ({ order: payOpenOrder, audits: [] }));
  bootstrap.create.mockImplementation(() =>
    makeReadyBootstrap({ ...occupiedHydrate, persistable: true }),
  );
  render(<App />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeTruthy());
  await signInViaUI(staffRecord.id, "7890");
  await waitFor(() => expect(screen.getByRole("heading", { name: "CafePOS" })).toBeTruthy());
  fireEvent.click(screen.getAllByRole("button", { name: /Bàn 1/i })[0]);
  await waitFor(() => expect(useOrderPaymentStore.getState().currentOrder?.items.length).toBe(1));
  const payButton = screen.getAllByRole("button", { name: /Thanh toán/i }).find((button) => !(button as HTMLButtonElement).disabled);
  expect(payButton).toBeTruthy();
  fireEvent.click(payButton!);
  await waitFor(() => expect(screen.getByLabelText("Số tiền khách đưa")).toBeTruthy());
  fireEvent.change(screen.getByLabelText("Số tiền khách đưa"), { target: { value: "25000" } });
  fireEvent.click(screen.getByRole("button", { name: /xác nhận thanh toán/i }));
}

test("conflict persist reconciles local loser to durable paid/empty and does not show receipt", async () => {
  persist.pay.mockImplementation(async () => ({ kind: "conflict" as const }));
  persist.loadPay.mockImplementation(async () => ({
    kind: "ok" as const,
    table: { ...occupiedHydrate.tables[0], status: "empty" as const, currentOrderId: undefined },
    order: { ...payOpenOrder, status: "paid" as const, paidAt: 20 },
    payments: [winnerPayment],
    audits: [winnerAudit],
  }));
  await openPayModal();
  await waitFor(() => {
    expect(useCatalogTableStore.getState().tables[0]?.status).toBe("empty");
  });
  expect(useOrderPaymentStore.getState().currentOrder?.status).toBe("paid");
  expect(useOrderPaymentStore.getState().payments.map((row) => row.id)).toEqual(["pay-win"]);
  expect(screen.queryByText(/thanh toán thành công/i)).toBeNull();
  expect(useOrderPaymentStore.getState().recordPayment({ ...winnerPayment, id: "pay-again", createdAt: 21 })).toBe(false);
});

test("io-error with durable predecessor rolls local payment back", async () => {
  persist.pay.mockImplementation(async () => ({ kind: "io-error" as const }));
  persist.loadPay.mockImplementation(async () => ({
    kind: "ok" as const,
    table: occupiedHydrate.tables[0],
    order: payOpenOrder,
    payments: [],
    audits: [],
  }));
  await openPayModal();
  await waitFor(() => {
    expect(persist.loadPay).toHaveBeenCalled();
  });
  expect(useOrderPaymentStore.getState().currentOrder?.status).toBe("open");
  expect(useOrderPaymentStore.getState().payments).toEqual([]);
  expect(useCatalogTableStore.getState().tables[0]).toMatchObject({ status: "occupied", currentOrderId: "order-1" });
  expect(screen.queryByText(/thanh toán thành công/i)).toBeNull();
});

test("local release fail after durable commit leaves a rebound table untouched and suppresses receipt", async () => {
  let resolvePay!: (value: { kind: "committed" }) => void;
  persist.pay.mockImplementation(() => new Promise((resolve) => { resolvePay = resolve; }));
  persist.loadPay.mockImplementation(async () => ({
    kind: "ok" as const,
    table: { ...occupiedHydrate.tables[0], status: "empty" as const, currentOrderId: undefined },
    order: { ...payOpenOrder, status: "paid" as const, paidAt: 20 },
    payments: [winnerPayment],
    audits: [winnerAudit],
  }));
  await openPayModal();
  act(() => {
    useCatalogTableStore.setState({
      tables: [{ ...occupiedHydrate.tables[0], status: "occupied", currentOrderId: "order-other" }],
    });
  });
  await act(async () => { resolvePay({ kind: "committed" }); });
  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent("Không lưu được thanh toán. Kiểm tra lại đơn trước khi thu tiếp.");
  });
  expect(useCatalogTableStore.getState().tables[0]).toMatchObject({ status: "occupied", currentOrderId: "order-other" });
  expect(screen.queryByText(/thanh toán thành công/i)).toBeNull();
});

test("logout then same-staff login while snapshot load awaits does not reconcile or show receipt", async () => {
  persist.pay.mockImplementation(async () => ({ kind: "conflict" as const }));
  persist.loadPay.mockImplementation(async () => {
    useTenantAuthStore.getState().signOut();
    await useTenantAuthStore.getState().signIn("7890", staffRecord, acceptAllVerifier);
    return {
      kind: "ok" as const,
      table: { ...occupiedHydrate.tables[0], status: "empty" as const, currentOrderId: undefined },
      order: { ...payOpenOrder, status: "paid" as const, paidAt: 20 },
      payments: [winnerPayment],
      audits: [winnerAudit],
    };
  });
  await openPayModal();
  await waitFor(() => {
    expect(persist.loadPay).toHaveBeenCalled();
  });
  expect(screen.queryByText(/thanh toán thành công/i)).toBeNull();
  expect(useCatalogTableStore.getState().tables[0]?.status).toBe("occupied");
});
