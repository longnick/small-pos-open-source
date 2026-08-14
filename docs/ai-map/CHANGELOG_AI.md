# AI Changelog

## 2026-08-14 02:01 - App shell nav aria-current

Repo: `/home/longnick/projects/small-pos-app-nav`
Branch: `fix/app-shell-nav`
Agent: Hermes / gcli/grok-4.6
Summary: Owner asked for App shell nav. View buttons now set `type="button"` and `aria-current="page"` on the active view. Visible labels unchanged. No layout/store/Dexie change.
Verification: App nav tests 2/2. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-14-0201-app-shell-nav.md`

## 2026-08-13 12:22 - StaffManagement trash name

Repo: `/home/longnick/projects/small-pos-staff-trash`
Branch: `fix/staff-trash-name`
Agent: Hermes / gcli/grok-4.6
Summary: Icon-only trash on StaffManagement rows now has Vietnamese name `Xóa {staff}`. Dummy CRUD still no-op. Same class as MenuManagement #22.
Verification: StaffManagement 4/4. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-1222-staff-trash-name.md`

## 2026-08-13 11:43 - MenuManagement icon names

Repo: `/home/longnick/projects/small-pos-icon-names`
Branch: `fix/menumgmt-icon-names`
Agent: Hermes / gcli/grok-4.6
Summary: Icon-only pencil/trash on MenuManagement rows now have Vietnamese names `Sửa {item}` / `Xóa {item}`. Dummy CRUD still no-ops. Staff trash left for next slice.
Verification: MenuManagement 5/5. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-1143-menumgmt-icon-names.md`

## 2026-08-13 10:31 - PaymentModal type=button

Repo: `/home/longnick/projects/small-pos-payment-type`
Branch: `fix/payment-type-button`
Agent: Hermes / gcli/grok-4.6
Summary: All PaymentModal buttons now set `type="button"` so they never submit if later wrapped in a form. Payment logic, tender, and receipt flow unchanged.
Verification: type=button tests 2/2. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-1031-payment-type-button.md`

## 2026-08-13 10:17 - StaffManagement shift aria-pressed

Repo: `/home/longnick/projects/small-pos-staff-pressed`
Branch: `fix/staff-shift-pressed`
Agent: Hermes / gcli/grok-4.6
Summary: Shift chips now expose exclusive `aria-pressed`, same class as Reports #19 / MenuManagement #18. Dummy staff list and icon buttons unchanged.
Verification: StaffManagement 3/3. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-1017-staff-shift-pressed.md`

## 2026-08-13 09:53 - ReportsPanel range aria-pressed

Repo: `/home/longnick/projects/small-pos-reports-pressed`
Branch: `fix/reports-range-pressed`
Agent: Hermes / gcli/grok-4.6
Summary: Range chips now expose exclusive `aria-pressed`, same class as Kitchen #15 / MenuGrid #16 / MenuManagement #18. Dummy stats/chart unchanged.
Verification: ReportsPanel 3/3. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0953-reports-range-pressed.md`

## 2026-08-13 09:30 - MenuManagement filter aria-pressed

Repo: `/home/longnick/projects/small-pos-menumgmt-filter`
Branch: `fix/menumgmt-filter-pressed`
Agent: Hermes / gcli/grok-4.6
Summary: Category filter chips now expose exclusive `aria-pressed`, same class as Kitchen #15 / MenuGrid #16. Dummy list and icon buttons unchanged.
Verification: MenuManagement 3/3. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0930-menumgmt-filter-pressed.md`

## 2026-08-13 09:20 - MenuGrid searchbox name

Repo: `/home/longnick/projects/small-pos-menugrid-search-name`
Branch: `fix/menugrid-search-name`
Agent: Hermes / gcli/grok-4.6
Summary: Searchbox now has Vietnamese accessible name `Tìm món`. Placeholder/layout unchanged.
Verification: MenuGrid 17/17. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0920-menugrid-search-name.md`

## 2026-08-13 07:22 - MenuGrid category aria-pressed

Repo: `/home/longnick/projects/small-pos-menugrid-pressed`
Branch: `fix/menugrid-category-pressed`
Agent: Hermes / gcli/grok-4.6
Summary: Category pills now expose exclusive `aria-pressed`, same class as Kitchen #15 / PaymentModal. Layout/copy unchanged.
Verification: MenuGrid 16/16. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0722-menugrid-category-pressed.md`

## 2026-08-13 07:06 - KitchenPanel filter aria-pressed

Repo: `/home/longnick/projects/small-pos-kitchen-filter`
Branch: `fix/kitchen-filter-pressed`
Agent: Hermes / gcli/grok-4.6
Summary: Kitchen filter chips now expose `aria-pressed` like PaymentModal method buttons. Layout/copy/dummy tickets unchanged.
Verification: KitchenPanel 6/6. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0706-kitchen-filter-pressed.md`

## 2026-08-13 06:52 - KitchenPanel empty-state a11y

Repo: `/home/longnick/projects/small-pos-kitchen-a11y`
Branch: `fix/kitchen-empty-a11y`
Agent: Hermes / gcli/grok-4.6
Summary: Empty kitchen filter now exposes Vietnamese `role="status"` + `aria-label`. Dummy tickets and layout unchanged. ChefHat marked `aria-hidden`.
Verification: KitchenPanel 3/3. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0652-kitchen-empty-a11y.md`

## 2026-08-13 06:35 - OrderPanel empty-state a11y

Repo: `/home/longnick/projects/small-pos-orderpanel-a11y`
Branch: `fix/orderpanel-empty-a11y`
Agent: Hermes / gcli/grok-4.6
Summary: Empty order now exposes Vietnamese `role="region"` + `aria-label`. Did not use `role="status"` — that role is reserved for the existing announcement live region. Layout/copy unchanged.
Verification: OrderPanel 38/38. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0635-orderpanel-empty-a11y.md`

## 2026-08-13 06:26 - MenuGrid search no-result a11y

Repo: `/home/longnick/projects/small-pos-menugrid-noresult`
Branch: `fix/menugrid-no-result-a11y`
Agent: Hermes / gcli/grok-4.6
Summary: Same class as #7/#11. Search no-result now exposes Vietnamese `role="status"` + `aria-label`. Layout/copy unchanged.
Verification: MenuGrid 13/13. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0626-menugrid-no-result-a11y.md`

## 2026-08-13 05:49 - MenuGrid empty-catalog a11y

Repo: `/home/longnick/projects/small-pos-menugrid-a11y`
Branch: `fix/menugrid-empty-a11y`
Agent: Hermes / gcli/grok-4.6
Summary: Same class as issue #7. Empty catalog now exposes Vietnamese `role="status"` + `aria-label`. Layout/copy unchanged. Kitchen dummy empty state left alone.
Verification: MenuGrid 12/12. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0549-menugrid-empty-a11y.md`

## 2026-08-13 05:41 - Issue #7 TableMap empty-state a11y

Repo: `/home/longnick/projects/small-pos-issue7`
Branch: `fix/issue-7-tablemap-empty-a11y`
Agent: Hermes / gcli/grok-4.6
Summary: Empty table map now exposes Vietnamese `role="status"` + `aria-label`. Layout/copy unchanged. TDD: RED missing status name, GREEN one-line a11y attrs.
Verification: TableMap 5/5. Full `npm run ci` + Sol review pending.
Next: Sol review, PR. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0541-issue-7-tablemap-empty-a11y.md`

## 2026-08-13 04:37 - Issue templates and triage labels

Repo: `/home/longnick/projects/small-pos-oss-triage`
Branch: `docs/issue-templates-triage`
Agent: Hermes / gcli/grok-4.6
Summary: Docs-only OSS hygiene. Added Documentation issue template, `needs-triage` on existing templates, CONTRIBUTING first-task + label table. No `src/` change.
Verification: Gemini Pro re-review APPROVE; `npm run ci` 393/393. Rebased onto merged #5.
Next: merge + Pages verify. No extra deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0437-issue-templates-triage.md`

## 2026-08-13 04:17 - Issue #3 tablet/desktop visual evidence

Repo: `/home/longnick/projects/small-pos-issue3`
Branch: `test/issue-3-tablet-desktop-visual`
Agent: Hermes / gcli/grok-4.6 via 9router
Summary: Isolated Playwright visual suite for local order-entry and order-line controls at 768×1024 and 1440×900. Reuses order-entry fixture. Default smoke ignores the spec. CI runs `npm run test:e2e:visual`. No production UI change.
Verification: `npm run test:e2e:visual` 4/4 passed. Full ci/E2E recorded in task log after this entry.
Next: merged as #5 (`7aa9080`).
Task log: `docs/ai-map/TASK_LOGS/2026-08-13-0417-issue-3-tablet-desktop-visual.md`

## 2026-08-12 03:40 - Task 2.9 minimal payment modal

Repo: `/home/longnick/projects/small-pos-release-task25`
Branch: `release/task-2-5-pin-login`
Summary: Owner-approved local read-only payment modal. It opens only for populated open order, shows passed store total and local method selection, and closes without payment mutation. No payment execution.
Verification: 314/314 unit; TypeScript/build/leakage/self-test; Task 2.9 safe-denial E2E at 390×844, 768×1024, 1440×900; normal dist fixture scan PASS. Terra removed a misleading paid-order test; paid-state executable proof deferred because safe public setup only selects open orders. Pixel inspection unavailable due vision-provider credit 402.
Next: scoped commit; full payment lifecycle requires explicit approval. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-12-0340-task-2-9-payment-modal.md`


## 2026-08-12 03:00 - Task 2.8 order panel

Repo: `/home/longnick/projects/small-pos-release-task25`
Branch: `release/task-2-5-pin-login`
Summary: Replaced hard-coded POS order display with read-only `OrderPanel` backed by existing order-payment store. Empty order is intentional; stored lines/totals render without local recomputation; nonimplemented controls are disabled.
Verification: 284/284 unit; TypeScript/build/leakage/self-test; Task 2.8 E2E at 390×844, 768×1024, 1440×900; normal dist fixture scan PASS. Terra source/spec review clear after restoring unrelated generated screenshots. Pixel inspection blocked by vision-provider credit 402.
Next: scoped commit and owner visual QA/merge approval. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-12-0300-task-2-8-order-panel.md`


## 2026-08-12 02:10 - Task 2.7 menu grid

Repo: `/home/longnick/projects/small-pos-release-task25`
Branch: `release/task-2-5-pin-login`
Summary: Replaced POS hard-coded menu panel with `MenuGrid` fed only by existing catalog-table store state. Covers available-item filtering, safe group/item sorting, local search/category repair, and intentional empty state. No catalog hydration or order mutation.
Verification: 272/272 unit; TypeScript/build/leakage/self-test; Task 2.7 E2E at 390×844, 768×1024, 1440×900; full Playwright 16 pass / 20 skipped; normal dist fixture scan PASS. Terra source/spec review clear after restoring unrelated old screenshots. Pixel screenshot inspection blocked by vision-provider credit 402.
Next: scoped commit and owner visual QA/merge approval. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-12-0210-task-2-7-menu-grid.md`


## 2026-08-12 01:40 - Task 2.6 table map

Repo: `/home/longnick/projects/small-pos-release-task25`
Branch: `release/task-2-5-pin-login`
Summary: Replaced hard-coded Lovable table cards with a presentational `TableMap` reading existing catalog-table store state. Empty store is deliberate and visible; stale local table selection clears when the record disappears. PIN gate remains unchanged.
Verification: 259/259 unit; TypeScript/build/leakage/self-test; Task 2.6 browser acceptance at 390×844, 768×1024, 1440×900; full Playwright 13 pass / 14 skipped; normal dist fixture scan PASS. Terra independent verdict APPROVED.
Next: scoped commit, then owner merge approval. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-12-0140-task-2-6-table-map.md`


## 2026-08-12 01:10 - Task 2.5 clean release reconstruction

Repo: `/home/longnick/projects/small-pos-release-task25`
Branch: `release/task-2-5-pin-login`
Summary: Reconstructed Task 2.5 only from dirty source into isolated release worktree. Excluded Task 2.4, package/lockfile, normal Vite config, storage, routing, and production data paths.
Verification: Fresh `npm ci`; focused unit 53/53; full unit 253/253; TypeScript; Vite build; leakage/self-test; whitespace; E-1 through E-6 and full Playwright all PASS. Normal production `dist` fixture identifier scan PASS.
Next: explicit-path commit and owner merge approval. No deploy.
Task log: `docs/ai-map/TASK_LOGS/2026-08-12-0110-task-2-5-clean-release-review.md`


## 2026-08-11 00:50 - Task 2.5 Strict Slice E gate normalization

Repo: `/home/longnick/projects/small-pos`
Branch: `main` (dirty; no commit/deploy)
Summary: Renamed existing credential-isolated Playwright acceptance tests to the approved E-1 through E-6 gate labels. No production behavior, fixture behavior, Vite configuration, or package configuration changed.
Verification: E-1 workers=1 PASS 3; E-1 workers=2 PASS 3; E-1..E-6 workers=2 PASS 7 / FAIL 0 / SKIP 8; full Playwright PASS 10 / FAIL 0 / SKIP 8; full unit 253/253; TypeScript/build/diff check and fixture-dist scan PASS.
Next: reconstruct and independently review a clean scoped Task 2.5 release unit before merge/deploy approval.
Task log: `docs/ai-map/TASK_LOGS/2026-08-11-0050-task-2-5-strict-slice-e-gate.md`


## 2026-08-08 — Task 2.5 PIN Login

Summary: Added in-memory Web Crypto PBKDF2 demo-auth adapter, accessible staff-select/masked-PIN login, and fail-closed app shell gate. Existing POS shell only renders after bootstrap-local successful sign-in for matching tenant/staff; no persistence, Dexie, routing, event bus, or other-store coupling.
Files: `src/auth/demo-auth-adapter.ts`, `src/components/auth/PinLogin.tsx`, `src/App.tsx`, focused adapter/component/App tests, task screenshots, bounded AI-map records.
Verification: 238 unit tests, TypeScript, Vite build, leakage scan/self-test, oxlint 0 errors, Playwright 3/3, 390×844 browser proof and diff check PASS. Historical strict TDD evidence partly interrupted by Kiro rate limit and Luna tool stall; controller regression RED→GREEN recorded in task log.
Task log: `docs/ai-map/TASK_LOGS/2026-08-08-0832-task-2-5-pin-login.md`


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
