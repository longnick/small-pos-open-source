# Task: Task 2.2 catalog/table store malformed input guards

Date: 2026-08-01 11:05 UTC
Repo: `/home/longnick/projects/small-pos`
Branch: `main`
User request: Fix `replaceTenantData` malformed public input failure with strict TDD, docs, and one bounded commit.

## Goal

Reject malformed runtime values before any collection access or state update. Preserve existing state on every rejection.

## TDD evidence

- RED: `npx vitest run src/stores/catalog-table-store.test.ts` → exit 1, PASS 12 / FAIL 13. Invalid `null` and numeric tenant IDs threw from `tenantId.trim`; malformed data/collections threw while reading or mapping fields.
- GREEN: `npx vitest run src/stores/catalog-table-store.test.ts` → PASS 25 / FAIL 0.

## Behavior

- `replaceTenantData` accepts primitive non-empty string tenant IDs only.
- Input data must be plain object with array `catalogGroups`, `catalogItems`, and `tables`.
- Every record must be non-null object with primitive string `id` and `tenantId`; catalog items also require primitive string `groupId`; tables also require finite numeric `number`.
- Malformed input returns `false` before `set`; prior tenant-scoped state remains unchanged.
- Existing duplicate, cross-tenant, orphan-item, and duplicate-table-number checks remain unchanged.

## Files changed

- `src/stores/catalog-table-store.ts`
- `src/stores/catalog-table-store.test.ts`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/TASK_LOGS/2026-08-01-1105-task-2-2-input-guards.md`

## Final verification

- `npm run ci:e2e` → PASS: `tsc --noEmit`, 16 unit files / 99 tests, Vite build, leakage scan, Playwright 3 tests.
- `git diff --check` → PASS.

## Scope

No UI wiring, persistence, CRUD, store coupling, raw seed conversion, order flow, package change, deploy, push, reset, stash, or amend.
