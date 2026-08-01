# Task: Task 2.2 catalog/table record validation

Date: 2026-08-01 11:35 UTC
Repo: `/home/longnick/projects/small-pos`
Branch: `main`

## Goal

Fail closed at `replaceTenantData` trust boundary without changing state on malformed, inherited, accessor, or hostile Proxy records.

## Behavior

- Materialize every group, item, and table once with own data-property descriptors only.
- Reject non-`Object.prototype` records, inherited fields, accessors, and descriptor/Proxy trap failures.
- Validate required runtime fields before duplicate, tenant, group-membership, and table-number checks.
- Commit only materialized record copies after all arrays validate.

## Validation contract

- Catalog groups: nonempty `id`, `tenantId`, `name`; finite `sortOrder`.
- Catalog items: nonempty identity, `groupId`, `name`; integer nonnegative `price`; boolean `available`; finite timestamps/sort order; optional strings only for `description` and `imageUrl`.
- Tables: nonempty `id`, `tenantId`, `staffId`; integer `number` in `[1, 10]`; allowed status; finite `openedAt`; optional string `currentOrderId`.

## TDD evidence

- RED: `npm test -- --run src/stores/catalog-table-store.test.ts` → PASS 30 / FAIL 18 before implementation.
- GREEN: `npm test -- --run src/stores/catalog-table-store.test.ts` → PASS 48 / FAIL 0.

## Final verification

- `npm run typecheck` → PASS.
- `npm run ci:e2e` → PASS: 16 unit files / 122 tests, Vite build, leakage scan, Playwright 3 tests.
- `git diff --check` and staged diff checks run before commit.

## Scope

No UI, persistence, dependencies, deploy, push, reset, stash, or amend changes.
