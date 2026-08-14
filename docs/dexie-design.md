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

Auth still comes from `bootstrapDemoAuth()`. Hydrate **must** take that tenant id as input. Do not load a tenant from IDB independently.

```ts
type DexieHydrateInput = {
  authenticatedTenantId: string; // t.id from bootstrapDemoAuth()
};

type DexieHydrateResult = {
  catalogGroups: CatalogGroup[];
  catalogItems: CatalogItem[];
  tables: PosTable[];
};
```

No `tenant`. No `staff`. No `currentOrder`. First adapter PR does not replace auth and does not restore an open order.

Boot stays `Promise.all([bootstrapDemoAuth(), bootstrapDemoPos()])` so the E2E module swap still works. Hydrate runs **after** that, only when production `pos` is `null`:

```ts
if (pos) {
  useCatalogTableStore.getState().replaceTenantData(t.id, pos);
  if (pos.currentOrder) useOrderPaymentStore.getState().selectOpenOrder(pos.currentOrder);
} else {
  const hydrated = await hydrateFromDexie({ authenticatedTenantId: t.id });
  if (hydrated) useCatalogTableStore.getState().replaceTenantData(t.id, hydrated);
}
```

`bootstrapDemoPos()` signature unchanged. E2E fixture may still ship `currentOrder`. Dexie path never does.

### Read set (first PR)

Read **only** these Dexie stores, in **one** read transaction:

- `tenants`
- `catalogGroups`
- `catalogItems`
- `tables`

Do **not** read `staff`, `orders`, `payments`, `shifts`, `auditLog`. Those stay unused until a later slice defines restore rules. Backup JSON still has 9 keys; hydrate is not backup.

### Accept

1. Open `PosDatabase` (`small-pos`). Isolated tests keep random names. Open/read throw or reject ⇒ return `null`.
2. One Dexie read transaction across the four stores. Mixed snapshots are a reject.
3. Require exactly one `Tenant` row and `tenant.id === authenticatedTenantId`.
4. Materialize every group / item / table with the same fail-closed rules as `replaceTenantData` (`materializeRecord`, no accessors / Proxy).
5. Required strings:
   - tenant: `id`, `name`, `address`, `phone`; `currency === "VND"`
   - group: `id`, `tenantId`, `name`
   - item: `id`, `tenantId`, `groupId`, `name`
   - table: `id`, `tenantId`, `staffId`
6. Every group / item / table `tenantId === authenticatedTenantId`.
7. Item `groupId` exists in the hydrated groups. Table `number` unique and in 1–10.
8. Run the **same** checks `replaceTenantData` would run, in memory, **before** any Zustand `set`.
9. Only then call `replaceTenantData(authenticatedTenantId, result)`. If it returns `false`, treat as reject even though pre-check passed (belt).
10. Do not call `selectOpenOrder`, `recordPayment`, `occupyTable`, `openShift`, or any other mutator.

### Atomic commit

Validate the full `DexieHydrateResult` first. Zero store writes until that object is complete and valid.

`replaceTenantData` is the only allowed mutation. It already no-ops on failure. First PR must **not** also call `selectOpenOrder`, so there is no catalog-ok / order-fail partial state.

If a later slice restores `currentOrder`, it must validate the order **before** either store write, then commit catalog/tables and order only if both validators would accept. This design forbids that restore.

### currentOrder (explicit non-goal)

First adapter PR sets **no** current order.

- IDB may contain 0, 1, or many `status: "open"` orders. Ignored.
- No “active table” input exists at boot (`App.tsx` hydrates before PIN UI).
- Restoring one open order needs a later design: pick rule, table bind, payments/shifts. Later #2.

Duplicate open orders across tables are a Later #2 problem. First PR does not interpret them.

### Reject (fail closed, no throw into UI)

- Dexie open / read / transaction error
- 0 tenants, >1 tenant, or `tenant.id !== authenticatedTenantId`
- empty required strings listed above
- catalog item `groupId` missing from groups
- table `number` outside 1–10 or duplicate number
- hostile / accessor / Proxy records
- backup-shaped blob in the wrong place
- `replaceTenantData` returns `false`

Empty IDB (no tenant row) is a **valid empty database**. Hydrate returns `null`. App keeps today’s empty-catalog demo. Not an error worth logging.

On any reject: log nothing secret (no PIN, hash, row payload, accessor dump). Return `null` from `bootstrapDemoPos()`. Do **not** auto-seed IDB from `DEMO_*` or `INITIAL_*`.

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

- new `src/pos/dexie-hydrate.ts` + test (`fake-indexeddb`)
- `src/App.tsx` — only the `else { hydrateFromDexie(t.id) }` branch above
- docs/ai-map

Do not change `bootstrapDemoPos()` signature. E2E still replaces that module.

Forbidden in that PR:

- `packages/pos-storage/src/db.ts` schema change
- Zustand persist / write-on-mutate
- `src/lib/pos.ts` rewrite
- payment / shift / cloud / Firebase
- checking `ROADMAP.md` Later #1 until hydrate is real and reviewed

TDD:
- RED: populated test DB + matching `authenticatedTenantId`, `bootstrapDemoPos()` still `null`.
- GREEN: hydrate returns validated catalog/tables; `replaceTenantData(id, result)` succeeds; `currentOrder` stays `null`.
- Abort: wrong tenant id, empty IDB, hostile row, Dexie open failure — all return `null`, stores unchanged.

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
