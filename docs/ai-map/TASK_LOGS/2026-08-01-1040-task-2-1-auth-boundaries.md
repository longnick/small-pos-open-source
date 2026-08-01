# Task: Task 2.1 tenant auth session boundaries

Date: 2026-08-01 10:40 UTC
Repo: `/home/longnick/projects/small-pos`
Branch: `main`
User request: Complete strict-TDD tenant auth boundary fix and make one bounded commit.

## Goal

Contain transient tenant/staff auth state across tenant changes, sign-out, and async verifier races. Keep UI, persistence, dependencies, and core API unchanged.

## TDD evidence

- Parent RED: `npx vitest run src/stores/tenant-auth-store.test.ts` → PASS 5 / FAIL 5. Expected failures: tenant switch clear, cross-tenant sign-in rejection, stale completion after sign-out, stale completion after tenant switch, and older concurrent sign-in.
- GREEN: `npx vitest run src/stores/tenant-auth-store.test.ts` → PASS 10 / FAIL 0.

## Behavior

- `setTenant` invalidates sign-ins and clears staff when tenant ID changes or tenant becomes null. Same ID retains staff.
- `signOut` invalidates pending sign-ins and clears staff while retaining tenant.
- `signIn` rejects absent active tenant or candidate tenant mismatch before verifier invocation.
- A verifier success sets staff only when its attempt is latest and captured tenant/session generation still match current state.
- Stale completion returns `false` and cannot alter staff.

## Files changed

- `src/stores/tenant-auth-store.ts`
- `src/stores/tenant-auth-store.test.ts`
- `docs/ai-map/CHANGELOG_AI.md`
- `docs/ai-map/TODO_AI.md`
- `docs/ai-map/FILE_RELATIONS.md`
- `docs/ai-map/TASK_LOGS/2026-08-01-1040-task-2-1-auth-boundaries.md`

## Final verification

- `npm run ci:e2e` → PASS: `tsc --noEmit`, 15 unit files / 74 tests, Vite build, leakage scan, Playwright 3 tests.
- `git diff --check` → exit 0.

## Scope

No UI, persistence/hydration, login screen, raw PIN storage, new dependency, deploy, migration, or POS data change.

## Cross-reference

Extends `docs/ai-map/TASK_LOGS/2026-08-01-1020-task-2-1-tenant-auth-store.md` with auth session-boundary containment.