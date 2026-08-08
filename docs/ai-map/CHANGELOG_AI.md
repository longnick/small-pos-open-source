# AI Changelog

## 2026-08-08 07:58 - Task 2.4 shift and audit Zustand store (strict TDD)

Repo: `/tmp/small-pos-task24-strict-tdd`
Base commit: `beda223`
Summary: Added in-memory shift lifecycle + append-only audit log hook. Four TDD slices: openShift (state + open guard), closeShift (time/money/note validation), appendAudit/auditsForEntity (identity dedup, insertion order, detached results), trust/ownership boundary (Proxy via structuredClone-throw, cyclic details via JSON.stringify, deep accessor scan, caller mutation isolation). materializeRecord uses structuredClone on top-level input to detect transparent Proxy. Details validated with hasNoAccessorInGraph recursion + JSON cycle gate before structuredClone.
Files changed: `src/stores/shift-audit-store.ts` (new), `src/stores/shift-audit-store.test.ts` (new), bounded AI map records.
Verification: Slice 1 RED (module absent) → GREEN 14 tests. Slice 2 RED (5 fail closeShift stub) → GREEN 27. Slice 3 RED (7 fail audit stub) → GREEN 38. Slice 4 RED (4 fail Proxy/cyclic/accessor/cycle boundary) → GREEN 55. Full gates: typecheck ✓, npm test 199/199 ✓, build ✓, scan:leakage ✓, test:scan-leakage ✓, oxlint 6 warnings 0 errors ✓, git diff --check ✓, E2E 3/3 ✓.
Known baseline: npm run lint exits 2 (ESLint JSON parse fail — pre-existing wrapper anomaly, not introduced here); direct oxlint passes.
Task log: `docs/ai-map/TASK_LOGS/2026-08-08-0758-task-2-4-strict-tdd.md`

## 2026-08-02 09:28 - Task 2.3 order and payment Zustand store

Repo: `/home/longnick/projects/small-pos`
Branch: `main`
Summary: Added bounded in-memory open order + payment list hook. Fail-closed validation on createOpenOrder, addItem, updateItemQuantity, removeItem, setDiscount, recordPayment. Pure order-calc delegation; no UI, Dexie, EventBus, or shift coupling.
Files changed: `src/stores/order-payment-store.ts`, `src/stores/order-payment-store.test.ts`, bounded AI map records.
Task log: `docs/ai-map/TASK_LOGS/2026-08-02-0928-task-2.3.md`

## 2026-08-01 11:15 - Task 2.2 catalog/table ownership and hostile input safety

Repo: `/home/longnick/projects/small-pos`
Branch: `main`
Summary: `replaceTenantData` now catches hostile getters/Proxies before `set` and copies validated records. Read helpers return record copies, preventing mutation outside Zustand.
Files changed: `src/stores/catalog-table-store.ts`, focused store test, bounded AI map records.
Verification: RED focused suite failed 4 ownership/hostile-input cases; GREEN passed 28 tests. Final gates recorded in task log.
Task log: `docs/ai-map/TASK_LOGS/2026-08-01-1115-task-2-2-ownership-input-safety.md`

## 2026-08-01 11:05 - Task 2.2 catalog/table malformed public input guards

Repo: `/home/longnick/projects/small-pos`
Branch: `main`
Summary: `replaceTenantData` now rejects malformed runtime values before field access: non-primitive/blank tenant IDs, non-plain data, missing/non-array collections, and invalid records. Rejection returns `false` without changing current state.
Files changed: `src/stores/catalog-table-store.ts`, focused store test, bounded AI map records.
Verification: RED target failed 13 malformed cases with field-access `TypeError`; GREEN target passed 25 tests. Final gates recorded in task log.
Task log: `docs/ai-map/TASK_LOGS/2026-08-01-1105-task-2-2-input-guards.md`

## 2026-08-01 10:54 - Task 2.2 catalog and table Zustand store

Repo: `/home/longnick/projects/small-pos`
Branch: `main`
Summary: Added bounded in-memory tenant catalog/table hook. Atomic replacement fails closed for invalid tenant data and preserves prior state; read helpers filter/sort without state mutation.
Files changed: `src/stores/catalog-table-store.ts`, focused store test, bounded AI map records.
Verification: RED target failed because `./catalog-table-store` module was absent; GREEN target passed 11 tests. Final gates recorded in task log.
Task log: `docs/ai-map/TASK_LOGS/2026-08-01-1054-task-2-2-catalog-table-store.md`

## 2026-08-01 10:40 - Task 2.1 tenant auth session boundaries

Repo: `/home/longnick/projects/small-pos`
Branch: `main`
Summary: Tenant/auth store now rejects cross-tenant sign-in before verifier work, clears staff on tenant boundary changes, and prevents stale or older async sign-ins from restoring staff.
Files changed: `src/stores/tenant-auth-store.ts`, focused store test, bounded AI map records.
Verification: Parent RED evidence: focused suite PASS 5 / FAIL 5 for required boundary cases. GREEN focused suite passed 10 tests; final gates recorded in task log.
Task log: `docs/ai-map/TASK_LOGS/2026-08-01-1040-task-2-1-auth-boundaries.md`

## 2026-08-01 10:20 - Task 2.1 tenant and auth Zustand store

Repo: `/home/longnick/projects/small-pos`
Branch: `main`
Agent: Hermes Agent
Summary: Added in-memory tenant/current-staff Zustand hook, injected PIN verification delegation, sign-out, and core RBAC delegation. No UI or persistence.
Files changed: `src/stores/tenant-auth-store.ts`, focused store test, exported core `PinHashVerifier`, Vitest source-test inclusion, approved Zustand dependency, bounded AI map records.
Verification: RED target failed because store module was absent; GREEN target passed 5 tests. Final gates recorded in task log.
Task log: `docs/ai-map/TASK_LOGS/2026-08-01-1020-task-2-1-tenant-auth-store.md`

## 2026-08-01 08:45 - Task 1.12 strict verifier result

Repo: `/home/longnick/projects/small-pos`
Branch: `main`
Agent: Hermes Agent
Summary: `verifyPin` accepts only verifier result `true`; `undefined`, strings, numbers, and objects fail closed.
Files changed: `packages/pos-core/src/auth.ts`, `packages/pos-core/test/auth.test.ts`, bounded AI map records.
Verification: RED target failed for `undefined`, `"yes"`, `1`, and `{}` verifier results; GREEN target passed 26 tests. Final gate results recorded in task log.
Task log: `docs/ai-map/TASK_LOGS/2026-08-01-0845-task-1-12-strict-verifier-result.md`

## 2026-08-01 08:32 - Task 1.12 non-string auth inputs

Repo: `/home/longnick/projects/small-pos`
Branch: `main`
Agent: Hermes Agent
Summary: `verifyPin` now requires primitive non-empty string hash before verifier; `canAccess` now rejects non-primitive role/action input before permission lookup or regex evaluation.
Files changed: `packages/pos-core/src/auth.ts`, `packages/pos-core/test/auth.test.ts`, bounded AI map records.
Verification: RED target failed with Symbol `TypeError`, boxed action access, numeric/boxed hash verifier access; GREEN target passed 22 tests; final gate results recorded in task log.
Task log: `docs/ai-map/TASK_LOGS/2026-08-01-0832-task-1-12-non-string-auth-inputs.md`

## 2026-08-01 08:20 - Task 1.12 non-string PIN guard

Repo: `/home/longnick/projects/small-pos`
Branch: `main`
Agent: Hermes Agent
Summary: `verifyPin` now rejects runtime non-string PIN input before regex evaluation and before verifier invocation.
Files changed: `packages/pos-core/src/auth.ts`, `packages/pos-core/test/auth.test.ts`, AI map task records.
Verification: RED target test failed with numeric PIN resolving `true`; GREEN target passed 18 tests; `npm run ci:e2e` passed 56 unit tests and 3 Playwright tests; `git diff --check` passed.
Next: Continue next approved Phase 1 task.
Task log: `docs/ai-map/TASK_LOGS/2026-08-01-0820-task-1-12-non-string-pin-guard.md`

## 2026-08-01 08:10 - Task 1.12 PIN auth and RBAC

Repo: `/home/longnick/projects/small-pos`
Branch: `main`
Agent: Hermes Agent
Summary: Added injected PIN hash verification with contained verifier failures and fail-closed role action guard.
Files changed: `packages/pos-core/src/auth.ts`, `packages/pos-core/test/auth.test.ts`, bounded AI map records.
Verification: targeted `auth.test.ts` passed 17 tests; `npm run ci:e2e` passed 55 unit tests and 3 Playwright tests; `git diff --check` passed.
Next: wire authentication into later UI/store phase only when planned.
Task log: `docs/ai-map/TASK_LOGS/2026-08-01-0810-task-1-12-rbac.md`
