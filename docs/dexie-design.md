# Dexie adapter design (Later #1)

Date: 2026-08-14
Repo: `longnick/small-pos-open-source`
Base: `main` `94bb10f`

This PR is **design only**. No adapter. No hydrate. No persist. No schema bump.

`ROADMAP.md` Later #1 stays `[ ]` until a later implementation PR lands.

## Goal

Define how IndexedDB (`packages/pos-storage`) will feed the existing in-memory Zustand stores — and what the first implementation PR is allowed to touch.

## Current truth (do not invent)

| Layer | Live state |
|---|---|
| Schema | Dexie **v1** already exists. 9 stores. Isolated tests pass. Unused by the app. |
| Backup | `exportBackup` / `importBackup` already exist. Version `1`. Fail-closed. Unused by UI. |
| Auth boot | `bootstrapDemoAuth()` hashes `DEMO_STAFF` PINs in memory every load. Fresh salt. No IDB. |
| POS boot | Production `bootstrapDemoPos()` returns `null`. E2E replaces the module at build time. |
| Catalog/tables in demo | Dummy `src/lib/pos.ts` (`INITIAL_MENU_ITEMS`, `INITIAL_STAFF`). Not `pos-core` types. |
| Domain stores | Zustand, fail-closed. Empty unless a test/fixture calls `replaceTenantData` / `selectOpenOrder`. |
| Dual audit | `useOrderPaymentStore.auditEntries` (payment) and `useShiftAuditStore.auditEntries` (shift). Separate. |

App already has a hydrate hook shape:

```ts
// src/App.tsx
if (pos) {
  useCatalogTableStore.getState().replaceTenantData(t.id, pos);
  if (pos.currentOrder) useOrderPaymentStore.getState().selectOpenOrder(pos.currentOrder);
}
```

Production `pos` is `null`. That is the only approved insertion point for a future adapter.

## Keep v1 schema

Do **not** bump Dexie version in the first adapter PR. Reuse:

```
tenants:        id
staff:          id, tenantId, pinHash
catalogGroups:  id, tenantId
catalogItems:   id, tenantId, groupId, [tenantId+available]
tables:         id, tenantId, number          // JS accessor: db.posTables
orders:         id, tenantId, tableId, status, createdAt
payments:       id, orderId, tenantId, createdAt
shifts:         id, tenantId, staffId, openedAt
auditLog:       id, tenantId, timestamp, action
```

Rules already locked by tests:

- Store name is `tables`, not `posTables`.
- `staff` indexes `pinHash`, never raw `pin`.
- `payments` indexes `createdAt`, not `paidAt`.
- Orders are **documents**: `Order.items[]` lives on the order row. No `orderItems` store.
- Backup JSON `version: 1` must list exactly those 9 keys, each an array.

## Hydrate contract

One function, called from the existing `bootstrapDemoPos` slot (or a sibling imported there). Stores stay the source of runtime truth after boot.

```ts
type DexieHydrateResult = {
  tenant: Tenant;
  staff: Staff[];          // pinHash only; never pin
  catalogGroups: CatalogGroup[];
  catalogItems: CatalogItem[];
  tables: PosTable[];
  currentOrder: Order | null;   // at most one open order for the active table, or null
};
```

### Accept

1. Open `PosDatabase` (`small-pos`). Isolated tests keep random names.
2. Read all 9 stores.
3. Require exactly one `Tenant`.
4. Every `Staff` / group / item / table / order / payment / shift / audit `tenantId` matches that tenant.
5. Pass catalog+tables through `replaceTenantData` (existing validator). If it returns `false`, **abort hydrate**. Leave stores empty. Do not partial-set.
6. `currentOrder`, if present, must already be `status: "open"` and pass `selectOpenOrder`. Else omit it (`null`).
7. Do not call `recordPayment`, `occupyTable`, `openShift`, or any mutator during hydrate.

### Reject (fail closed, no throw into UI)

- 0 or >1 tenant
- empty required string ids
- catalog item `groupId` missing from groups
- table `number` outside 1–10 or duplicate number
- raw `pin` field on a staff row
- hostile / accessor / Proxy records (same materialize rules as stores)
- backup-shaped blob in the wrong place

On reject: log nothing secret. Return `null` from bootstrap. App stays on PIN screen with empty catalog (today’s production demo). Do **not** auto-seed IDB from `DEMO_*` or `INITIAL_*`.

### Do not persist yet

First adapter PR is **read-only hydrate**.

Out of that PR:

- write-back on occupy / addItem / pay / shift
- Dexie `liveQuery` / middleware persist
- multi-tab (`later #3`)
- reload/replay, backup UI, corruption recovery (`later #2`)
- migration docs (`later #4`)
- bcrypt / cloud verifier
- mapping dummy `src/lib/pos.ts` into Dexie

Dummy Menu / Staff / Kitchen / Reports panels stay on `INITIAL_*` until a later UI slice. Hydrate only feeds **domain** stores used by TableMap / MenuGrid / OrderPanel / payment.

## PIN

- IDB stores `pinHash` only.
- Demo verifier (`v1$salt$k`) stays injected. Adapter must not log PIN or hash.
- First hydrate PR does **not** replace `bootstrapDemoAuth()`. Auth remains in-memory seed until a dedicated auth-persistence slice.
- If a later slice persists staff, it writes the already-hashed `v1$…` string. Never `DEMO_STAFF.pin`.

## Seed policy

Two catalogs exist. Do not merge them in the adapter.

| Source | Used by | Persist? |
|---|---|---|
| `src/data/demo-seed.ts` | PIN list + auth tenant | Not in IDB (first PR) |
| `src/lib/pos.ts` `INITIAL_*` | Dummy settings/kitchen/reports UI | Never in IDB |
| `packages/pos-core` records | Domain stores + future IDB | Yes, later |

Empty IDB is valid. Public GitHub Pages demo stays empty-catalog after PIN, same as today.

E2E fixture module remains the only way tests inject domain catalog/tables/orders. Adapter must not break that replace-at-build-time path.

## First implementation PR (after this design merges)

Name: `feat(storage): hydrate domain stores from Dexie v1` (suggested).

Allowed files:

- `src/pos/demo-pos-bootstrap.ts` (or new `src/pos/dexie-hydrate.ts` imported by it)
- tests next to it (`fake-indexeddb`)
- docs/ai-map

Forbidden in that PR:

- `packages/pos-storage/src/db.ts` schema change
- Zustand persist / write-on-mutate
- `src/lib/pos.ts` rewrite
- payment / shift / cloud / Firebase
- checking `ROADMAP.md` Later #1 until hydrate is real and reviewed

TDD: RED = `bootstrapDemoPos()` still `null` with a populated test DB; GREEN = hydrate returns validated `DexieHydrateResult` and `replaceTenantData` succeeds. Abort path covered.

Reviewer: `cx/gpt-5.6-sol`. Trust `returned_model=gpt-5.6-sol`.

## Later leftovers (not this design)

2. Reload/replay, backup/restore UI, corruption
3. Idempotency + concurrent-write across tabs
4. Migration + recovery docs

Schema bump (`version(2)`) only when a later slice needs a new store or index. Backup `version` stays `1` until then.

## Non-goals

- Xe Khô dogfood, Capacitor, Cloud Sync, module marketplace
- July Notion tasks 2.10–2.14
- Issue #1 (contributor docs)
