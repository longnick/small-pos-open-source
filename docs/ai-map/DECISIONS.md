# Decisions

## 2026-08-14 - Dexie hydrate is read-only v1, no auto-seed

Context: Owner asked for Later #1 design PR (schema + hydrate contract). Schema and backup already exist unused. Production `bootstrapDemoPos()` returns `null`. Two dummy catalogs (`demo-seed` vs `src/lib/pos.ts`) are not `pos-core` records.

Decision: Keep Dexie v1. First adapter PR reads only tenants+catalog+tables in one transaction, binds `tenant.id === authenticatedTenantId` from `bootstrapDemoAuth()`, validates fully, then `replaceTenantData` only. No `currentOrder` restore. Empty IDB returns `null`. No auto-seed. No persist. No schema bump. Auth stays in-memory.

Reason: Fail-closed stores already validate. Auto-seed would mix dummy UI data into domain IDB and change the public empty-catalog demo. Write-back, multi-tab, backup UI, and auth persistence are Later #2–#4 / separate slices.

Impact: hydrate impl started on `feat/dexie-hydrate`. `ROADMAP.md` Later #1 stays unchecked until this PR merges.

Revisit when: persist / currentOrder restore / `version(2)`.
