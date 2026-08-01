# Task: Task 2.2 catalog and table Zustand store

Date: 2026-08-01 10:54 UTC
Repo: `/home/longnick/projects/small-pos`
Branch: `main`
User request: Implement bounded Zustand catalog/table store with strict TDD, docs, and one commit.

## Goal

Keep in-memory tenant-scoped catalog groups, catalog items, and POS tables. Accept only internally consistent tenant data. No UI, persistence, CRUD, raw seed conversion, order flow, or store coupling.

## TDD evidence

- RED: `npx vitest run src/stores/catalog-table-store.test.ts` → exit 1, `Failed to resolve import "./catalog-table-store" from "src/stores/catalog-table-store.test.ts". Does the file exist?`
- GREEN: `npx vitest run src/stores/catalog-table-store.test.ts` → PASS 11 / FAIL 0.

## Behavior

- `replaceTenantData` rejects blank tenant ID, duplicate IDs within each collection, tenant mismatches, orphan catalog items, and duplicate table numbers.
- Every rejected replacement returns `false` and leaves prior store state unchanged.
- Valid replacement returns `true` and replaces all tenant-scoped arrays in one `set` call with cloned arrays.
- `clear` resets tenant ID and all arrays.
- `itemsForGroup` returns only available items, ordered by `sortOrder`, then ID, without mutating stored items.
- `tableById` returns matching table or `null`.

## Files changed

- `src/stores/catalog-table-store.ts`
- `src/stores/catalog-table-store.test.ts`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/CODE_MAP.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/TASK_LOGS/2026-08-01-1054-task-2-2-catalog-table-store.md`

## Final verification

- `npm run ci:e2e` → PASS: `tsc --noEmit`, 16 unit files / 85 tests, Vite build, leakage scan, Playwright 3 tests.
- `git diff --check` → exit 0.
- Notion public/integration unavailable. Recorded only; no auth attempt.

## Scope

No UI wiring, Dexie persistence/hydration, CRUD, tenant/auth-store coupling, raw data seed conversion, order flow, new package, deploy, push, reset, stash, or amend.
