# File Relations

## Module: Core authentication and authorization

Purpose: validate staff PIN through injected hash verifier and enforce POS action permissions.

Related files:

- `packages/pos-core/src/auth.ts`
  - role: exports `PinHashVerifier`, `verifyPin`, and `canAccess`.
  - depends on: `packages/pos-core/src/types.ts` for `Role`.
  - used by: `src/stores/tenant-auth-store.ts` plus future login/action adapters; no UI, DB, or storage wiring in Phase 2 Task 2.1.
  - notes: verifier is injected; bcrypt and cloud sync remain out of scope.

- `packages/pos-core/src/types.ts`
  - role: defines shared POS domain records, including tenant-tagged `CatalogGroup`, `CatalogItem`, and `PosTable`.
  - depends on: none.
  - used by: core modules and Zustand stores.

- `packages/pos-core/test/auth.test.ts`
  - role: covers PIN validation/failure containment and RBAC policy.
  - depends on: `packages/pos-core/src/auth.ts`.
  - used by: Vitest.
  - notes: 26 cases cover roles, wildcards, malformed/non-primitive PIN hashes/actions, strict boolean verifier results, sync/async verifiers, and failure paths.

## Module: Tenant and auth store

Purpose: keep transient tenant/current-staff application state and delegate authentication/authorization to POS core.

Related files:

- `src/stores/tenant-auth-store.ts`
  - role: exports `useTenantAuthStore` Zustand React hook with tenant, staff, sign-in/out, and authorization state operations.
  - depends on: `packages/pos-core/src/types.ts` and `packages/pos-core/src/auth.ts`.
  - used by: future UI/auth adapters; no PIN UI, Dexie persistence/hydration, or storage wiring in Task 2.1.
  - notes: no raw PIN state; candidate `pinHash` stays within transient core verification call. Tenant changes and sign-out invalidate pending sign-ins; only latest verified sign-in for unchanged captured tenant/session can set staff.

- `src/stores/tenant-auth-store.test.ts`
  - role: covers tenant changes, tenant-match sign-in guard, stale/latest async sign-in boundaries, rejected sign-in session preservation, sign-out, and RBAC delegation.
  - depends on: `src/stores/tenant-auth-store.ts`.
  - used by: Vitest.

## Module: Catalog and table store

Purpose: keep transient tenant-scoped catalog and table data only after full input validation.

Related files:

- `src/stores/catalog-table-store.ts`
  - role: exports `useCatalogTableStore` Zustand React hook with atomic `replaceTenantData`, `clear`, sorted available-item lookup, and table lookup.
  - depends on: `packages/pos-core/src/types.ts`.
  - used by: future catalog/table UI adapters; no current UI, Dexie persistence/hydration, CRUD, tenant/auth-store coupling, raw seed conversion, or order-flow wiring in Task 2.2.
  - notes: replacement rejects malformed or hostile runtime input before `set`, copies validated records, and preserves existing state on rejection. Read helpers return copies after filtering/sorting or lookup.

- `src/stores/catalog-table-store.test.ts`
  - role: covers atomic valid replacement, caller-record and returned-record isolation, fail-closed hostile/malformed validation with state preservation, clearing, available item sorting/non-mutation, and table lookup.
  - depends on: `src/stores/catalog-table-store.ts` and POS core domain types.
  - used by: Vitest.

## Module: Order and payment store (Task 2.3)

Purpose: keep transient in-memory open order and payment list with full fail-closed input validation.

Related files:

- `src/stores/order-payment-store.ts`
  - role: exports `useOrderPaymentStore` with createOpenOrder, selectOpenOrder, addItem, updateItemQuantity, removeItem, setDiscount, recordPayment, clearCurrentOrder.
  - depends on: `packages/pos-core/src/types.ts`, `packages/pos-core/src/order-calc.ts`.
  - used by: future order/payment UI adapters; no UI, Dexie, EventBus, or table/shift coupling in Task 2.3.

- `src/stores/order-payment-store.test.ts`
  - role: covers order/payment mutation, isolation, and hostile-input boundary.
  - depends on: `src/stores/order-payment-store.ts`.
  - used by: Vitest.

## Module: Shift and audit store (Task 2.4)

Purpose: keep transient in-memory current shift lifecycle and append-only audit log with full trust boundary.

Related files:

- `src/stores/shift-audit-store.ts`
  - role: exports `useShiftAuditStore` with openShift, closeShift, appendAudit, auditsForEntity, clear. All public inputs are `unknown`; fail closed — returns false, no throw, preserves state on any invalid input.
  - depends on: `packages/pos-core/src/types.ts` (Shift, AuditEntry only).
  - used by: future shift UI adapters; no UI, Dexie, EventBus, report computation, order/payment coupling in Task 2.4.
  - notes: materializeRecord uses structuredClone-on-input to detect Proxy (throws in V8/jsdom). Details deep-scanned for accessor properties and JSON.stringify-checked for cycles before cloning.

- `src/stores/shift-audit-store.test.ts`
  - role: 55 tests across 4 TDD slices: openShift (14), closeShift (13), appendAudit/auditsForEntity (16), trust/ownership boundary (12 + clear).
  - depends on: `src/stores/shift-audit-store.ts`.
  - used by: Vitest.

## Module: PIN login UI (Task 2.5)

Purpose: create ephemeral demo auth records and gate the Lovable POS shell behind a matching authenticated tenant/staff session.

- `src/auth/demo-auth-adapter.ts` — maps demo seed into core records and injected native Web Crypto verifier; no storage or raw PIN output.
- `src/components/auth/PinLogin.tsx` — presentation-only accessible staff/PIN form with generic error and synchronous submit lock.
- `src/App.tsx` — bootstraps adapter, delegates sign-in to tenant auth store, and renders shell only after bootstrap-local successful session. View nav buttons expose `aria-current="page"` on the active view.
- `src/auth/demo-auth-adapter.test.ts`, `src/components/auth/PinLogin.test.tsx`, `src/App.test.tsx` — adapter, form, and fail-closed gate coverage.
- Scope: no Dexie, routing, event bus, persistence, or other-store coupling.

## Module: Minimal payment modal (Task 2.9)

Purpose: owner-approved local payment choice preview for an existing open populated order, deliberately excluding payment execution.

- `src/components/pos/PaymentModal.tsx` — accessible local dialog; reads passed total, stores selection only in component state, cancels/closes without domain write. All buttons set `type="button"`.
- `src/components/pos/PaymentModal.test.tsx` — dialog, passed-total, method choice, cancel, no-confirm surface, and explicit `type="button"` lock.
- `src/components/pos/OrderPanel.tsx` — local modal gate restricted to current store order status `open` with items; no `recordPayment` call.
- `src/components/pos/OrderPanel.test.tsx` / `src/App.test.tsx` — eligibility, dialog and null-order denial boundaries.
- `e2e/smoke.spec.ts` — fixture-authenticated null-order denial evidence at 390×844, 768×1024, and 1440×900.
- Scope: no payment write/receipt/change/staff/timestamp/table lifecycle. Paid-state executable setup needs separate approved full-payment scope.

## Module: POS order panel (Task 2.8)

Purpose: render existing in-memory current order in the Lovable shell without introducing checkout, kitchen, or line-edit behavior.

- `src/components/pos/OrderPanel.tsx` — reads `useOrderPaymentStore.currentOrder`; displays empty state or stored lines/totals and disables unimplemented controls.
- `src/components/pos/OrderPanel.test.tsx` — null/empty/store-order display, stored totals, disabled-control coverage, and empty-state `role=region` name.
- `src/App.tsx` — passes presentation-only selected table and reads store item count for mobile tab badge; no order-store mutation.
- `src/App.test.tsx` — authenticated shell empty-order boundary coverage.
- `e2e/smoke.spec.ts` — fixture-authenticated empty-order evidence at 390×844, 768×1024, and 1440×900.
- Scope: no order creation/edit/payment/kitchen lifecycle, persistence, seed, or fixture data. Populated-order browser proof requires a later approved data lane.

## Module: POS menu grid (Task 2.7)

Purpose: render read-only in-memory catalog groups and available items in the existing Lovable POS menu panel.

- `src/components/pos/MenuGrid.tsx` — presentational groups/search/item grid with local category reconciliation; emits no domain mutation.
- `src/components/pos/MenuGrid.test.tsx` — ordering, availability, search, named searchbox, empty/no-result `role=status` names, category `aria-pressed`, category switch/removal, VND, and presentation-only button coverage.
- `src/App.tsx` — reads catalog groups/items from `useCatalogTableStore` and passes them into `MenuGrid`; order panel remains independent presentation.
- `src/App.test.tsx` — covers authenticated store-fed menu and empty store state.
- `e2e/smoke.spec.ts` — fixture-authenticated empty-menu evidence at 390×844, 768×1024, and 1440×900.
- Scope: no hydration, seed, persistence, store mutation, or order/payment coupling. Actual populated-card browser proof requires a later approved data lane.

## Module: Table map (Task 2.6)

Purpose: render current in-memory catalog-table store records in the existing Lovable POS shell without creating or mutating domain data.

- `src/components/pos/TableMap.tsx` — presentational table card grid; sorts a copied `PosTable[]`, maps core statuses, renders empty state, and emits selected ID.
- `src/components/pos/TableMap.test.tsx` — status, sort, selection, visual-selection, and empty-state `role=status` name (issue #7).
- `src/App.tsx` — subscribes to `useCatalogTableStore.tables`; owns local selection and clears it when store records remove selected ID. Does not hydrate or mutate the store.
- `src/App.test.tsx` — covers authenticated empty store and removal of selected table.
- `e2e/smoke.spec.ts` — fixture-authenticated empty table-map acceptance at 390×844, 768×1024, and 1440×900.
- Scope: no seed/hydration/persistence/order/payment/shift/EventBus coupling. Actual table cards require a future approved data-population lane.

## Module: Tablet/desktop visual evidence (issue #3)

Purpose: isolated fixture Playwright proof of order-entry and order-line controls at 768×1024 and 1440×900.

Related files:

- `e2e/visual-tablet-desktop.spec.ts` — tablet/desktop workflow + overflow + control-box checks; writes `docs/ai-map/TASK_LOGS/issue-3-*.png`
- `playwright.visual.config.ts` — dedicated config, port 5277, tablet + desktop projects only
- `vite.order-entry-e2e.config.ts` / `e2e/fixtures/test-order-entry-bootstrap.ts` — reused fixture aliases
- `playwright.config.ts` — ignores the visual spec so default smoke stays isolated
- `.github/workflows/ci.yml` — runs `npm run test:e2e:visual`

Scope: no production UI change, no persistence, no cloud, no real payment data.

## Module: GitHub issue hygiene

Purpose: keep public issues fixture-safe and triaged.

Related files:

- `.github/ISSUE_TEMPLATE/bug_report.yml`
  - role: reproducible bug form. Labels `bug` + `needs-triage`.
- `.github/ISSUE_TEMPLATE/feature_request.yml`
  - role: bounded feature form. Labels `enhancement` + `needs-triage`.
- `.github/ISSUE_TEMPLATE/docs.yml`
  - role: docs-only form. Labels `documentation` + `needs-triage`.
- `.github/ISSUE_TEMPLATE/config.yml`
  - role: disables blank issues; points security to advisories and questions to Discussions.
- `CONTRIBUTING.md`
  - role: first-task path and label table.

## Module: Kitchen panel (presentation dummy)

Purpose: render hardcoded kitchen tickets in the Lovable shell. No store, no fixture, no mutations.

- `src/components/pos/KitchenPanel.tsx` — local filter + dummy tickets; empty filter exposes Vietnamese `role=status` name; filter chips expose `aria-pressed`.
- `src/components/pos/KitchenPanel.test.tsx` — empty-filter text, named status, default dummy tickets, and filter `aria-pressed`.
- `src/App.tsx` — mounts `KitchenPanel` in the kitchen tab.

## Module: Menu management (presentation dummy)

Purpose: render hardcoded catalog rows in the Lovable shell. No store, no mutations.

- `src/components/pos/MenuManagement.tsx` — local search + category filter over `INITIAL_MENU_ITEMS`; filter chips expose `aria-pressed`; icon pencil/trash named `Sửa {item}` / `Xóa {item}`; search named `Tìm món`.
- `src/components/pos/MenuManagement.test.tsx` — default pressed, unpressed siblings, click exclusivity, named pencil/trash, named searchbox.
- `src/App.tsx` — mounts `MenuManagement` in the menu tab.

## Module: Reports panel (presentation dummy)

Purpose: render hardcoded report metrics in the Lovable shell. No store, no mutations.

- `src/components/pos/ReportsPanel.tsx` — local range chips over dummy stats/chart; chips expose `aria-pressed`.
- `src/components/pos/ReportsPanel.test.tsx` — default pressed, unpressed siblings, click exclusivity.
- `src/App.tsx` — mounts `ReportsPanel` in the report tab.

## Module: Staff management (presentation dummy)

Purpose: render hardcoded staff rows in the Lovable shell. No store, no mutations.

- `src/components/pos/StaffManagement.tsx` — local shift filter over `INITIAL_STAFF`; chips expose `aria-pressed`; icon trash named `Xóa {staff}`.
- `src/components/pos/StaffManagement.test.tsx` — default pressed, unpressed siblings, click exclusivity, named trash.
- `src/App.tsx` — mounts `StaffManagement` in the staff tab.

## Module: POS core

- `packages/pos-core/src/order-calc.ts`, `shift-report.ts`, `event-bus.ts`
  - role: independent typed domain utilities.
  - depends on: `packages/pos-core/src/types.ts` where needed.
  - used by: unit tests and future application adapters.
