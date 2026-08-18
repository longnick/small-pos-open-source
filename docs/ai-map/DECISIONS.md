# Decisions

## 2026-08-18 - Send kitchen is a real order status, pay still allowed

Context: Sprint 2 first vertical slice after #38. Gửi bếp was a disabled no-op. Payment only accepted `open`. Restore rejected `sentAt`.

Decision: `sendToKitchen` flips current open order to `sent` with integer `sentAt` and durable audit id `send:{orderId}`. Payment accepts `open|sent` and persists `payment:{paymentId}` with typed CAS. Conflict/io-error reads a fail-closed durable snapshot and atomically reconciles Zustand only when the winner/predecessor graph is exact. Session token changes on login/logout/re-login; token mismatch never shows receipt. Rebound tables stay occupied. Kitchen panel stays hard-coded until Sprint 5.

Reason: Sell flow needs send before pay without inventing a kitchen queue. Reload must not drop a sent ticket or invent success before durable write.

Impact: `persistAfterSend`/`persistAfterPay` + OrderPanel/PaymentModal await + isolated `test:e2e:sell`. Menu/staff CRUD not in this slice.

Revisit when: kitchen queue or cancel-with-reason.

## 2026-08-14 - Restore impl is occupied-table click only

Context: Owner said `Làm tiếp đi` after #32 design merged `08d0a8f`.

Decision: Implement `loadOpenOrderForTable` + `classifyTableOrderBind`. App occupied / waiting_payment branch loads then `selectOpenOrder`, then React `setSelectedTableId`. No boot restore. No Dexie write. No ROADMAP tick. Issue #1 / PR #31 untouched.

Reason: Design already locked the pick rule. One currentOrder slot.

Impact: Reload can reopen a persisted open order by clicking its table.

Revisit when: Later #3 multi-tab, backup UI, or paid-occupied repair.

## 2026-08-14 - Dexie restore is occupied-table click, not boot

Context: Owner named Later #2 after #30 persist. Hydrate still catalog/tables only. Occupied table click is a no-op when `currentOrder` is null. Backup helpers exist unused.

Decision: Design only. Restore one open order when the cashier selects its occupied / waiting_payment table after a hydrate-success session. Do not restore at boot (PIN not yet chosen; many tables). Do not swap an existing `currentOrder`. Do not auto-repair paid-occupied. Missing / invalid `currentOrderId` is `missing-order`: no Dexie read, no Zustand write, no highlight. After a successful `selectOpenOrder`, `setSelectedTableId` is App React `useState`, not a second Zustand write. Backup UI is a later increment. No schema bump. Later #1 and Later #2 stay unchecked.

Reason: One `currentOrder` slot. Boot has no selected table. Persist already wrote the bind `table.currentOrderId === order.id`. Click is the existing UI that can name that bind.

Impact: `docs/dexie-restore.md` locks the impl allowlist. No restore code in this PR.

Revisit when: owner names restore impl, or Later #3 multi-tab.

## 2026-08-14 - Dexie persist is post-hydrate, three clusters, no restore

Context: Owner named persist write-back after #28 hydrate. Occupy/create, order edit, and pay/release already succeed in memory. IDB still unread for orders.

Decision: Persist only after a successful hydrate this session. Write `tables` + `orders` + `payments` only, one transaction per cluster. Occupy writes table+order together. Pay: after `recordPayment` true, attempt `releaseTable`, then persist the post-attempt snapshot (empty table if release ok; occupied table + paid order + payment if release fails). Dexie fail does not roll back Zustand. No currentOrder restore. No schema bump. No auto-seed. Later #1 stays unchecked in this design PR.

Reason: Memory is already the accepted mutation. Durable copy must not invent a half-occupy or hide a recorded payment. Reload restore and multi-tab are Later #2/#3.

Impact: `src/pos/dexie-persist.ts` implements the design. Later #1 stays unchecked until owner ticks after persist is live.

Revisit when: Later #2 restore, or owner ticks Later #1.

## 2026-08-14 - Dexie hydrate is read-only v1, no auto-seed

Context: Owner asked for Later #1 design PR (schema + hydrate contract). Schema and backup already exist unused. Production `bootstrapDemoPos()` returns `null`. Two dummy catalogs (`demo-seed` vs `src/lib/pos.ts`) are not `pos-core` records.

Decision: Keep Dexie v1. First adapter PR reads only tenants+catalog+tables in one transaction, binds `tenant.id === authenticatedTenantId` from `bootstrapDemoAuth()`, validates fully, then `replaceTenantData` only. No `currentOrder` restore. Empty IDB returns `null`. No auto-seed. No persist. No schema bump. Auth stays in-memory.

Reason: Fail-closed stores already validate. Auto-seed would mix dummy UI data into domain IDB and change the public empty-catalog demo. Write-back, multi-tab, backup UI, and auth persistence are Later #2–#4 / separate slices.

Impact: hydrate impl started on `feat/dexie-hydrate`. `ROADMAP.md` Later #1 stays unchecked until this PR merges.

Revisit when: persist / currentOrder restore / `version(2)`.
