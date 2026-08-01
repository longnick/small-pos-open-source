# Task: Task 2.2 catalog/table ownership and hostile input safety

Date: 2026-08-01 11:15 UTC
Repo: `/home/longnick/projects/small-pos`
Branch: `main`
User request: Fix catalog/table store ownership and hostile-input defects with strict TDD, docs, and one bounded commit.

## Goal

Prevent caller mutation from changing Zustand state. Fail closed on hostile getters and Proxies without throwing or updating state.

## TDD evidence

- RED: `npx vitest run src/stores/catalog-table-store.test.ts` → exit 1, PASS 24 / FAIL 4. Caller record mutation, returned item/table mutation, throwing getter, and throwing Proxy defects reproduced.
- GREEN: `npx vitest run src/stores/catalog-table-store.test.ts` → PASS 28 / FAIL 0.

## Behavior

- `replaceTenantData` wraps validation, derived checks, and record spreads in `try/catch`; exceptions return `false` before `set`.
- Valid replacement copies each group, item, and table record into store arrays.
- `itemsForGroup` returns copied sorted records.
- `tableById` returns copied record or `null`.

## Files changed

- `src/stores/catalog-table-store.ts`
- `src/stores/catalog-table-store.test.ts`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/TASK_LOGS/2026-08-01-1115-task-2-2-ownership-input-safety.md`

## Final verification

- `npm run ci:e2e` → PASS: `tsc --noEmit`, 16 unit files / 102 tests, Vite build, leakage scan, Playwright 3 tests.
- `git diff --check` → PASS.

## Scope

No UI, persistence, domain policy, package, deploy, push, reset, stash, or amend changes.
