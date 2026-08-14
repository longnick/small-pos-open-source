# Task: Dexie persist write-back design

Date: 2026-08-14 07:50 UTC
Repo: `/home/longnick/projects/small-pos-dexie-persist`
Branch: `docs/dexie-persist`
AI/Agent: Hermes / gcli/grok-4.6
User request: `Duyệt làm tiếp` after #28 → owner named persist write-back (design/review)

## Before state

- Existing branch: `docs/dexie-persist` from `origin/main` `e39858e`
- Existing uncommitted files: none at start
- Relevant AI map files read: TODO_AI, CHANGELOG_AI, CODE_MAP, FILE_RELATIONS, DECISIONS
- Relevant source files read: `docs/dexie-design.md`, `src/App.tsx` occupy/pay, `PaymentModal.tsx`, `MenuGrid.tsx`, `OrderPanel.tsx`, `packages/pos-storage/src/db.ts`, store types

## Goal

Khóa contract ghi Dexie sau occupy / order-edit / pay. Docs only. Không adapter ghi.

## Files changed

- `docs/dexie-persist.md` — write-back design
- `docs/dexie-design.md` — pointer to persist design
- `ROADMAP.md` / `README.md` — links; Later #1 stays `[ ]`
- `docs/ai-map/*` — this increment

## Code relations

- Hydrate (`src/pos/dexie-hydrate.ts`) stays read-only
- Future `src/pos/dexie-persist.ts` writes `tables` + `orders` + `payments` only
- Call sites: App occupy cluster, MenuGrid/OrderPanel edits, PaymentModal pay cluster

## Decisions made

- Session gate: persist only after successful hydrate this session
- E2E / empty IDB: no-op
- One transaction per cluster; occupy never writes table-without-order
- Pay/release split persisted as-is; no Zustand rollback on Dexie fail
- No `currentOrder` restore (Later #2)
- No schema bump, no auto-seed, no Later #1 checkbox

## Verification

Docs only. Sol after commit. No persist code. No `npm run ci` needed beyond existing tree.

## Remaining issues

Implementation PR waits for owner after this design merges.

## Next step

Sol review. Open PR. Do not merge. Do not write `dexie-persist.ts`.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
