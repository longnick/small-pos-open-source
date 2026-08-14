# Decisions

## 2026-08-14 - Dexie hydrate is read-only v1, no auto-seed

Context: Owner asked for Later #1 design PR (schema + hydrate contract). Schema and backup already exist unused. Production `bootstrapDemoPos()` returns `null`. Two dummy catalogs (`demo-seed` vs `src/lib/pos.ts`) are not `pos-core` records.

Decision: Keep Dexie v1. First adapter PR may only read IDB and pass catalog/tables through existing `replaceTenantData` / `selectOpenOrder`. Empty IDB is valid. Do not auto-seed from `DEMO_*` or `INITIAL_*`. Do not persist mutations. Do not bump schema. Auth stays in-memory `bootstrapDemoAuth()`.

Reason: Fail-closed stores already validate. Auto-seed would mix dummy UI data into domain IDB and change the public empty-catalog demo. Write-back, multi-tab, backup UI, and auth persistence are Later #2–#4 / separate slices.

Impact: `ROADMAP.md` Later #1 stays unchecked. Implementation waits for owner after this design merges.

Revisit when: owner names the hydrate implementation PR, or a later slice needs `version(2)`.
