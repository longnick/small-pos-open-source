# Decisions

## 2026-08-14 - Dexie persist is post-hydrate, three clusters, no restore

Context: Owner named persist write-back after #28 hydrate. Occupy/create, order edit, and pay/release already succeed in memory. IDB still unread for orders.

Decision: Persist only after a successful hydrate this session. Write `tables` + `orders` + `payments` only, one transaction per cluster. Occupy writes table+order together. Pay writes paid order + payment + released table together. Dexie fail does not roll back Zustand. No currentOrder restore. No schema bump. No auto-seed. Later #1 stays unchecked in this design PR.

Reason: Memory is already the accepted mutation. Durable copy must not invent a half-occupy or hide a recorded payment. Reload restore and multi-tab are Later #2/#3.

Impact: `docs/dexie-persist.md` locks the impl allowlist. No persist code in this PR.

Revisit when: owner names persist impl, or Later #2 restore.

## 2026-08-14 - Dexie hydrate is read-only v1, no auto-seed

Context: Owner asked for Later #1 design PR (schema + hydrate contract). Schema and backup already exist unused. Production `bootstrapDemoPos()` returns `null`. Two dummy catalogs (`demo-seed` vs `src/lib/pos.ts`) are not `pos-core` records.

Decision: Keep Dexie v1. First adapter PR reads only tenants+catalog+tables in one transaction, binds `tenant.id === authenticatedTenantId` from `bootstrapDemoAuth()`, validates fully, then `replaceTenantData` only. No `currentOrder` restore. Empty IDB returns `null`. No auto-seed. No persist. No schema bump. Auth stays in-memory.

Reason: Fail-closed stores already validate. Auto-seed would mix dummy UI data into domain IDB and change the public empty-catalog demo. Write-back, multi-tab, backup UI, and auth persistence are Later #2–#4 / separate slices.

Impact: hydrate impl started on `feat/dexie-hydrate`. `ROADMAP.md` Later #1 stays unchecked until this PR merges.

Revisit when: persist / currentOrder restore / `version(2)`.
