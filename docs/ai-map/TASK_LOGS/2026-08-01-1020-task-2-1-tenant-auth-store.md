# Task: Task 2.1 tenant and auth Zustand store

Date: 2026-08-01 10:20 UTC
Repo: `/home/longnick/projects/small-pos`
Branch: `main`
AI/Agent: Hermes Agent
User request: Add bounded Zustand tenant/auth store with strict TDD, docs, and commit.

## Goal

Provide in-memory tenant/session state, injected PIN verification, and core RBAC delegation. Exclude UI, persistence/hydration, login screen, raw PIN storage, and policy duplication.

## Files changed

- `src/stores/tenant-auth-store.ts` — Zustand React hook; tenant/session state and core auth delegation.
- `src/stores/tenant-auth-store.test.ts` — focused store behavior coverage.
- `packages/pos-core/src/auth.ts` — exports existing `PinHashVerifier` type.
- `vitest.config.ts` — includes `src/**/*.test.ts` so application store tests run.
- `package.json`, `package-lock.json` — Zustand dependency from approved install.
- AI map records — relation and task status updates.

## TDD evidence

- RED: `npx vitest run src/stores/tenant-auth-store.test.ts` → exit 1; `Failed to resolve import "./tenant-auth-store"`.
- GREEN: `npx vitest run src/stores/tenant-auth-store.test.ts` → PASS, 5 tests.

## Behavior

- `setTenant` sets or clears tenant.
- `signIn` passes transient candidate `pinHash` to core `verifyPin`; only strict success updates `staff`.
- Invalid or rejected verification returns `false` and preserves existing `staff`.
- `signOut` clears only `staff`.
- `can` fails closed without session and delegates to core `canAccess` otherwise.

## Scope and blocked work

No UI, Dexie persistence/hydration, login screen, raw PIN store state, bcrypt/cloud adapter, Notion, credentials, deploy, migration, or POS data changed.

Notion public/integration status update blocked by missing user credentials/access. Not attempted.

## Final verification

- `npm run ci:e2e` → PASS: `tsc --noEmit`, 15 unit files / 69 tests, Vite build, leakage scan, Playwright 3 tests.
- `git diff --check` → exit 0.
- Staged diff check and commit pending.

## Next step

Continue approved Phase 2 work.
