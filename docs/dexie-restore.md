# Dexie restore / reload design (Later #2)

Date: 2026-08-14
Repo: `longnick/small-pos-open-source`
Base: `main` `50c0fae` (#30 persist)

This PR is **design only**. No restore adapter. No `selectOpenOrder` from IDB. No backup UI. No schema bump.

`ROADMAP.md` Later #1 and Later #2 stay `[ ]` until a later implementation PR lands and is reviewed.

Hydrate contract stays in [`docs/dexie-design.md`](dexie-design.md). Write-back stays in [`docs/dexie-persist.md`](dexie-persist.md). This doc only defines reload restore, backup UI bounds, and corruption classification.

## Goal

After a successful catalog/tables hydrate, let the cashier reopen an already-persisted **open** order by selecting its occupied table. Reload must not invent a current order at boot.

Memory (Zustand) stays runtime truth after a successful `selectOpenOrder`. Dexie stays the durable copy.

## Current truth (do not invent)

| Layer | Live state |
|---|---|
| Hydrate | `hydrateFromDexie({ authenticatedTenantId })` after auth, else-branch only. Catalog/tables. No `currentOrder`. |
| Persist | Occupy / order-edit / pay write `tables` + `orders` + `payments` after hydrate-success this session. |
| Boot | `App.tsx` hydrates **before** PIN UI. No selected table. `currentOrder` stays `null`. |
| Table select | Empty table + no `currentOrder` → occupy + create. Occupied table + no `currentOrder` → **no-op**. Existing `currentOrder` → only change `selectedTableId`. |
| Store | `selectOpenOrder` accepts one `status: "open"` document. Rejects paid / sent / cancelled. One `currentOrder` only. |
| Backup | `exportBackup` / `importBackup` exist. Version `1`. Import clears all 9 stores then `bulkPut`. No UI. |
| E2E | `bootstrapDemoPos()` replaced at build time. Hydrate skipped. Fixture may already inject `currentOrder`. |
| Schema | Dexie **v1**. Orders are documents (`Order.items[]` on the row). |

## Why not restore at boot

1. Hydrate runs before PIN. A restored order would sit in memory for any staff who signs in.
2. Many occupied tables can exist. There is no “active table” input.
3. `useOrderPaymentStore` holds one `currentOrder`. Boot cannot pick among several open orders.

First restore impl therefore **does not** call `selectOpenOrder` from the hydrate else-branch.

## Gate

Restore reads Dexie **only** when this session already accepted a Dexie hydrate (`setDexiePersistSession(true)`). Same flag as persist.

| Session | Restore on occupied-table click |
|---|---|
| Production + hydrate success | Read the bound open order |
| Production + empty / rejected IDB | No-op. No tables to click. |
| E2E fixture (`pos != null`) | No-op. Never read `small-pos` for fixture rows. |

Do **not** infer “should restore” from IndexedDB existing.

## Pick rule (table select)

Reuse `handleTableSelect`. Change only the occupied / `waiting_payment` + `currentOrder === null` branch.

Sequence:

1. Existing guards stay first: if `currentOrder !== null`, only `setSelectedTableId`. Do **not** swap the in-memory order.
2. Empty table path unchanged (occupy + create + persist).
3. If table is `occupied` or `waiting_payment` and `currentOrder === null` and persist session is on:
   1. Snapshot `table.currentOrderId`. If it is missing, empty, or not a nonempty string, stop. No Dexie read. No Zustand write. No `setSelectedTableId`. Classify `missing-order`.
   2. `await loadOpenOrderForTable({ authenticatedTenantId }, { tableId: table.id, expectedOrderId })`.
   3. If the function returns an order, `selectOpenOrder(order)`. That is the **only Zustand write**. Then `setSelectedTableId(table.id)` — App React `useState`, not a store. It only highlights the table. It must not swap or clear `currentOrder`.
   4. If `selectOpenOrder` returns `false`, leave Zustand unchanged. Do not occupy a new order on that table. Do not change `selectedTableId`.
   5. If the function returns `null` (missing / corrupt / paid-occupied), leave Zustand unchanged. Do not change `selectedTableId`. Do not auto-release. Do not create a replacement order.

Clicking another occupied table while `currentOrder` is already set still only changes the highlight. Multi-order switching is out of this slice.

## API (implementation PR)

One module: `src/pos/dexie-restore.ts`.

```ts
type DexieRestoreInput = {
  authenticatedTenantId: string;
  databaseName?: string; // tests only; app uses default `small-pos`
};

type TableOrderBind =
  | "ok"
  | "missing-order"
  | "paid-occupied"
  | "status-mismatch"
  | "table-mismatch"
  | "tenant-mismatch"
  | "duplicate-open"
  | "invalid-record";

loadOpenOrderForTable(
  input: DexieRestoreInput,
  ref: { tableId: string; expectedOrderId: string },
): Promise<Order | null>

classifyTableOrderBind(
  table: PosTable,
  order: Order | null,
  extras?: { openOrdersForTable: Order[] },
): TableOrderBind
```

`loadOpenOrderForTable` reads Dexie. It does **not** mutate Zustand. App calls `selectOpenOrder` only after a non-null return. `setSelectedTableId` is React local state in `App.tsx`, not Zustand. After a successful `selectOpenOrder`, highlighting the table is allowed. It is not a second store write.

Read set: `orders` (required). `payments` only to classify `paid-occupied`. Do **not** write. Do **not** read `staff` / `shifts` / `auditLog` / catalog.

One readonly transaction. Open/read throw ⇒ `null`.

## Accept / reject

Before returning an order:

1. Session gate above (caller). Function itself still validates identity.
2. Open `PosDatabase`. Open/read throw ⇒ `null`.
3. `materializeRecord` the same way persist/stores do. Accessor / Proxy ⇒ `null`.
4. `order.tenantId === authenticatedTenantId`.
5. `order.id === expectedOrderId`.
6. `order.tableId === tableId`.
7. `order.status === "open"`.
8. Same open-order document rules as `selectOpenOrder` (items on the row, totals recompute, no hostile `paidAt` / `cancelledAt` on an open row).
9. If another `status: "open"` row shares the same `tableId`, return `null` (`duplicate-open`). Do not pick by `createdAt`.

`classifyTableOrderBind` is pure. Use it in tests and, later, a status region. First impl may keep it unmounted.

| Bind | Meaning | First impl |
|---|---|---|
| `ok` | Occupied / waiting_payment table, matching open order | `selectOpenOrder` |
| `missing-order` | Table points at an id that is absent | No-op |
| `paid-occupied` | Table still occupied, order `paid` (persist pay / failed release) | No-op. Do not restore. Do not hide the payment. |
| `status-mismatch` | Order sent / cancelled, or empty table + leftover open order | No-op |
| `table-mismatch` | Order exists but `tableId` ≠ table | No-op |
| `tenant-mismatch` | Wrong tenant | No-op |
| `duplicate-open` | Two open orders for one table | No-op |
| `invalid-record` | Hostile / totals fail / schema junk | No-op |

On reject: return `null`. Log nothing secret (no PIN, hash, row payload, accessor dump). **Do not write Dexie to “fix” the row.** **Do not roll back catalog/tables already hydrated.**

## What this is not

- Boot-time `currentOrder` restore.
- Swapping `currentOrder` when another occupied table is clicked.
- Auto-repair of `paid-occupied` (release table, or rewrite order status).
- Event-bus replay. Reload is document read, not audit replay.
- Backup / import UI — designed below, **not** in the first restore impl.
- Multi-tab / `liveQuery` — Later #3.
- Migration docs — Later #4.
- Auto-seed `DEMO_*` / `INITIAL_*`.
- Schema `version(2)`.
- Changing `bootstrapDemoPos()` signature.
- Ticking `ROADMAP.md` Later #1 or Later #2 in this design PR **or** in the first restore impl PR.
- Issue #1 / PR #31 (contributor docs). Leave them.

## Backup / import (design only; later increment)

`packages/pos-storage/src/backup.ts` already exports version-1 JSON and fail-closed import.

Rules for a **later** backup UI increment, not the first restore impl:

- Export downloads the existing JSON. Do not display `pinHash` or raw PIN.
- Import is destructive (clears 9 stores). Require an explicit confirm. Then re-run hydrate (and clear `currentOrder`).
- Reject unsupported `version`, bad store list, non-array stores — already thrown by `importBackup`. Surface a generic fail. Do not partial-import.
- Never auto-import on boot.
- E2E fixture must not call import into `small-pos`.

First restore impl must not add that UI.

## First implementation PR (after this design merges)

Name: `feat(storage): restore open order on occupied table select` (suggested).

Allowed files:

- new `src/pos/dexie-restore.ts` + `src/pos/dexie-restore.test.ts` (`fake-indexeddb`)
- `src/App.tsx` — occupied / `waiting_payment` branch of `handleTableSelect` only, after persist-session check
- `src/App.test.tsx` — hydrate-success + occupied table click restores; E2E / empty IDB never call restore
- docs/ai-map

Forbidden in that PR:

- `packages/pos-storage/src/db.ts` schema change
- `packages/pos-storage/src/backup.ts` UI wiring
- Zustand persist middleware
- `src/lib/pos.ts` / demo-seed rewrite
- `hydrateFromDexie` growing an order field
- Boot-time `selectOpenOrder` from IDB
- Auto-repair writes
- `ROADMAP.md` checkbox
- issue #1 / PR #31

TDD:

- RED: hydrate-success session, occupied table + matching open order in IDB, `currentOrder` null; click does not load the order.
- GREEN: click calls `loadOpenOrderForTable` then `selectOpenOrder`; store matches the Dexie document; Dexie unread for writes. `selectedTableId` may update via React state only after `selectOpenOrder` true.
- Reject: missing / invalid `currentOrderId`, missing order, paid-occupied, table mismatch, tenant mismatch, duplicate open, hostile Proxy, Dexie open fail → `null`, Zustand `currentOrder` stays null, `selectedTableId` unchanged, table row unchanged.
- Existing `currentOrder` + click other occupied table: only `selectedTableId` changes.
- Empty IDB / E2E `pos != null`: restore never called.

Reviewer: `cx/gpt-5.6-sol`. Trust `returned_model=gpt-5.6-sol`.

## Later leftovers (not this design)

3. Idempotency + concurrent-write across tabs
4. Migration + recovery docs
- Backup UI increment (after restore impl)
- Auto-repair for `paid-occupied`
- Multi-order switcher

## Non-goals

- Xe Khô dogfood, Capacitor, Cloud Sync, module marketplace
- July Notion tasks 2.10–2.14
- Issue #1 (contributor docs) / open PR #31
- Phase 3–6 / payment gateways / cloud auth
