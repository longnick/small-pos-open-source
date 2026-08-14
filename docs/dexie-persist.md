# Dexie persist write-back design

Date: 2026-08-14
Repo: `longnick/small-pos-open-source`
Base: `main` `e39858e` (#28 hydrate)

This PR is **design only**. No persist adapter. No store hook. No schema bump.

`ROADMAP.md` Later #1 stays `[ ]` until a later implementation PR lands and is reviewed.

Hydrate contract stays in [`docs/dexie-design.md`](dexie-design.md). This doc only defines write-back.

## Goal

After a successful in-memory occupy / order-edit / pay cluster, write the matching Dexie v1 rows so a later reload can hydrate catalog/tables (already shipped) and, in Later #2, restore orders.

Memory (Zustand) stays runtime truth during the session. Dexie is a durable copy of already-accepted records.

## Current truth (do not invent)

| Layer | Live state |
|---|---|
| Hydrate | `hydrateFromDexie({ authenticatedTenantId })` after auth, else-branch only. Catalog/tables. No `currentOrder`. |
| Empty IDB | Hydrate returns `null`. Public demo stays empty-catalog. Occupy cannot succeed (no tables). |
| Occupy cluster | `App.tsx`: `occupyTable` then `createOpenOrder`. Create fail → `releaseTable`. |
| Order edit | `MenuGrid` / `OrderPanel`: `addItem` / `updateItemQuantity` / `removeItem`. Discount only in store tests today. |
| Pay cluster | `PaymentModal.confirm`: `recordPayment` then `onPaymentSuccess` → `releaseTable`. Receipt only if both succeed. |
| E2E | `bootstrapDemoPos()` replaced at build time. Hydrate skipped. Fixture catalog is not Dexie. |
| Schema | Dexie **v1**, 9 stores. Orders are documents (`Order.items[]` on the order row). |

## Gate

Persist runs **only** when this session already accepted a Dexie hydrate (`hydrateFromDexie` returned non-null).

| Session | Persist |
|---|---|
| Production + hydrate success | Write after the clusters below |
| Production + empty / rejected IDB | No-op. Demo stays empty. |
| E2E fixture (`pos != null`) | No-op. Never write fixture rows into `small-pos`. |

Set a session flag in `App.tsx` next to the existing else-branch. Do **not** infer “should persist” from IndexedDB existing.

## Write set

Reuse Dexie v1. Do **not** bump `version`. Write only:

- `tables` (`db.posTables`)
- `orders`
- `payments`

Do **not** write `tenants`, `staff`, `catalogGroups`, `catalogItems`, `shifts`, `auditLog`. Catalog stays hydrate-only until a catalog-edit slice. Auth/shift stay in-memory.

## API (implementation PR)

One module: `src/pos/dexie-persist.ts`.

```ts
type DexiePersistInput = {
  authenticatedTenantId: string;
  databaseName?: string; // tests only; app uses default `small-pos`
};

type PersistResult = true | false;

persistAfterOccupy(input, { table: PosTable; order: Order }): Promise<PersistResult>
persistAfterOrderEdit(input, { order: Order }): Promise<PersistResult>
persistAfterPay(input, { table: PosTable; order: Order; payment: Payment }): Promise<PersistResult>
```

Call **after** the Zustand cluster returns success (pay: after `recordPayment` true, even if `releaseTable` is false). Pass materialized snapshots from `getState()`, not the raw click payload.

Hydrate does not mutate Zustand. Persist does not mutate Zustand. Persist writes Dexie only. Same split.

## Clusters

### 1. Occupy + create

After `occupyTable` **and** `createOpenOrder` both return `true`:

One Dexie readwrite transaction:

1. `posTables.put(table)` — occupied, `currentOrderId === order.id`
2. `orders.put(order)` — `status: "open"`, `items: []`

If `createOpenOrder` fails, `releaseTable` already rolled memory back. **No Dexie write.**

Do not persist the occupy-only half. A table-occupied / no-order row is forbidden.

### 2. Order edit

After `addItem` / `updateItemQuantity` / `removeItem` / `setDiscount` returns `true`:

One transaction: `orders.put(currentOrder)` with the full document (items on the row).

No table write. No payment write.

`setDiscount` has no UI yet. Still persist if a later control calls it.

### 3. Pay + release

Sequence after `recordPayment` returns `true`: (1) attempt `releaseTable`, (2) snapshot `getState()`, (3) `persistAfterPay`. Never persist before the release attempt. Persist **regardless** of `releaseTable` result.

| `recordPayment` | `releaseTable` | Persist? | Snapshot |
|---|---|---|---|
| false | not called | No | — |
| true | true | Yes | paid order + payment + empty table |
| true | false | Yes | paid order + payment + occupied table (memory split) |

One transaction writes those three rows as memory left them. Do not invent a rollback. Do not hide the payment. Later #2 treats the occupied+paid split as corruption.

`clearCurrentOrder` on receipt close is UI-only. No Dexie delete.

## Accept / reject

Before any `put`:

1. Session gate above.
2. Open `PosDatabase`. Open/write throw ⇒ return `false`.
3. `materializeRecord` the same way stores do. Accessor / Proxy ⇒ `false`.
4. Every row `tenantId === authenticatedTenantId`.
5. Occupy: `table.status === "occupied"` and `table.currentOrderId === order.id` and `order.status === "open"`.
6. Pay: `order.status === "paid"` and `payment.orderId === order.id` and `payment.tenantId === authenticatedTenantId`. Table may be empty (release ok) or still occupied with `currentOrderId === order.id` (release failed). Reject any other table snapshot.
7. Order document: items array on the row. No `orderItems` store.
8. `put` by `id`. Overwrite same id is the idempotency story for this slice.

On reject: return `false`. Log nothing secret (no PIN, hash, row payload, accessor dump). **Do not roll back Zustand.** Session already accepted the mutation. User keeps working. Durable copy may lag until Later #2 surfaces it.

Empty IDB never reaches these writers (gate + occupy needs hydrated tables).

## What this is not

- Reload / restore `currentOrder` — Later #2: [`docs/dexie-restore.md`](dexie-restore.md). After persist, reload still hydrates catalog/tables only until that impl. Open orders sit in IDB unread. That is intended.
- Multi-tab / Dexie `liveQuery` / middleware — Later #3.
- Backup UI / corruption recovery UI — Later #2.
- Auto-seed `DEMO_*` / `INITIAL_*` into IDB.
- Schema `version(2)`.
- Changing `bootstrapDemoPos()` signature.
- Ticking `ROADMAP.md` Later #1 in this design PR **or** in the first persist impl PR. Checkbox waits for owner after persist is live.

## First implementation PR (after this design merges)

Name: `feat(storage): persist occupy/order/pay to Dexie v1` (suggested).

Allowed files:

- new `src/pos/dexie-persist.ts` + `src/pos/dexie-persist.test.ts` (`fake-indexeddb`)
- `src/App.tsx` — session flag after successful hydrate; call `persistAfterOccupy` after occupy+create; pass snapshots into pay success
- `src/components/pos/PaymentModal.tsx` / `App` — after `recordPayment` true: (1) attempt `releaseTable`, (2) snapshot `getState()`, (3) `persistAfterPay`. Never persist before the release attempt.
- `src/components/pos/MenuGrid.tsx` / `OrderPanel.tsx` — `persistAfterOrderEdit` after mutator `true`
- docs/ai-map

Prefer calling persist from `App` callbacks already owned by occupy/pay. Order-edit must touch MenuGrid/OrderPanel because those mutators live there.

Forbidden in that PR:

- `packages/pos-storage/src/db.ts` schema change
- Zustand persist middleware
- `src/lib/pos.ts` / demo-seed rewrite
- staff / shift / catalog / auditLog writes
- `selectOpenOrder` from IDB
- `ROADMAP.md` checkbox
- issue #1

TDD:

- RED: hydrate-success session + occupy cluster; IDB has no order row.
- GREEN: one transaction wrote occupied table + open order; stores unchanged by persist itself.
- Order edit: `orders` row items/totals match `currentOrder`.
- Pay: paid order + payment + empty table in one transaction. Also lock pay-true / release-false → occupied table + paid order + payment.
- Abort: no hydrate flag; Dexie open fail; hostile snapshot; tenant mismatch — return `false`; Zustand byte-for-byte unchanged (already true if called after success; also lock “no write when mutator returned false”).
- E2E / `pos != null`: persist functions never called (App/PaymentModal tests).

Reviewer: `cx/gpt-5.6-sol`. Trust `returned_model=gpt-5.6-sol`.

## Later leftovers (not this design)

2. Reload/replay, restore open order, backup UI, corruption (including pay/release split) — design: [`docs/dexie-restore.md`](dexie-restore.md)
3. Idempotency + concurrent-write across tabs
4. Migration + recovery docs

## Non-goals

- Xe Khô dogfood, Capacitor, Cloud Sync, module marketplace
- July Notion tasks 2.10–2.14
- Issue #1 (contributor docs)
- Phase 3–6 / payment gateways / cloud auth
