import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Staff, Tenant } from "../packages/pos-core/src/types";
import type { PinHashVerifier } from "../packages/pos-core/src/auth";
import type { DemoAuthBootstrap } from "./auth/demo-auth-adapter";
import { useTenantAuthStore } from "./stores/tenant-auth-store";
import { useCatalogTableStore } from "./stores/catalog-table-store";

// ---------------------------------------------------------------------------
// Hoisted mock — per-test implementation via mockImplementation
// ---------------------------------------------------------------------------

const bootstrap = vi.hoisted(() => {
  // Typed as () => Promise<DemoAuthBootstrap> so mockImplementation accepts resolved values.
  // vi.fn<T> in vitest 4 takes a single function-type argument.
  return {
    create: vi.fn<() => Promise<DemoAuthBootstrap>>(
      () => new Promise<DemoAuthBootstrap>(() => {})
    ),
  };
});

vi.mock("@/auth/demo-auth-adapter", () => ({
  bootstrapDemoAuth: bootstrap.create,
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

function makeReadyBootstrap() {
  return Promise.resolve({
    tenant,
    staff: [staffRecord],
    verifier: acceptAllVerifier,
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
  useTenantAuthStore.setState({ tenant: null, staff: null });
  useCatalogTableStore.setState({ tenantId: null, catalogGroups: [], catalogItems: [], tables: [] });
  bootstrap.create.mockClear();
  // Default: bootstrap never resolves (pending forever)
  bootstrap.create.mockImplementation(() => new Promise<DemoAuthBootstrap>(() => {}));
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
      tenant,
      staff: [mismatchedStaff],
      verifier: acceptAllVerifier,
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
// Task 2.6 Slice 2 — catalog table store as sole table-map source
// ---------------------------------------------------------------------------

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
