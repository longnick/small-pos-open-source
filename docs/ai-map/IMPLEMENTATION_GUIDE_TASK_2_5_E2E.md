# Task 2.5 E2E credential-isolated proof — Sol guide

Source: `cx/gpt-5.6-sol`, 2026-08-08.

## Decision

Use **build-time exact-module substitution** only for Playwright's Vite server.

- Production `src/App.tsx` remains unchanged.
- Normal `vite.config.ts` and `npm run build` remain unchanged.
- New `vite.e2e.config.ts` aliases only `@/auth/demo-auth-adapter` to `e2e/fixtures/test-auth-adapter.ts`.
- Fixture exports same `bootstrapDemoAuth()` shape, fake tenant/staff and delayed verifier.
- Fixture accepts generic `2468`, rejects `1357` and all other values. These must not collide with real demo PINs; no test imports seed to check that.
- Fixture has no runtime selector, URL/storage/global switch, and never enters production `dist`.

This gives post-auth browser proof without importing/submitting raw demo PIN. No production test backdoor.

## Kiro slices

### Slice A: E2E bootstrap substitution

Allowed: `vite.e2e.config.ts`, `e2e/fixtures/test-auth-adapter.ts`, `playwright.config.ts`, `e2e/smoke.spec.ts`.

RED: add Playwright assertion for `Fixture Manager`; it fails against production adapter. Run:

```bash
npx playwright test e2e/smoke.spec.ts --grep "uses isolated E2E auth bootstrap"
```

GREEN: dedicated config starts Vite with exact adapter alias, test sees `Fixture Manager`. Also `npm run build` stays green. No changes in `src/**`.

### Slice B: pre-auth acceptance, one test per viewport

Allowed: `e2e/smoke.spec.ts`, fixture only if delay needs adjustment.

At 390×844 and 1440×900 assert before auth: exact login heading visible, CafePOS heading/header absent, layout has no horizontal overflow, password input has `type=password`, `inputmode=numeric`, `autocomplete=off`.

Invalid fixture PIN must expose busy state then generic error, clear and focus PIN, retain no shell. During busy assert `aria-busy=true` and all form controls disabled. Use state assertions, not sleeps.

After submission, both fixture PINs must be absent from URL, serialized DOM, visible text, attributes, console, request URLs. Input value only exists while active typing; that is normal browser behavior.

### Slice C: authenticated proof and evidence

Allowed: `e2e/smoke.spec.ts`, task log, screenshots only.

Fresh browser session: select fake staff, enter `2468`, submit; assert login heading absent and exact CafePOS heading/header present. Capture viewport screenshots, not full-page:

```text
task-2-5-e2e-login-390x844.png
task-2-5-e2e-masked-390x844.png
task-2-5-e2e-busy-390x844.png
task-2-5-e2e-invalid-390x844.png
task-2-5-e2e-shell-390x844.png
# repeat with 1440x900
```

## Required non-negotiables

- No seed import, raw demo PIN, direct Zustand mutation, `page.evaluate()` session injection, local/session storage or URL bypass.
- No broad alias, production config change, test-only App prop/factory, `window`/global runtime switch.
- Verifier must not accept every PIN; 250ms fixed fixture delay makes busy deterministic.
- Screenshot claims require assertions first.
- Historical browser evidence using production PIN is superseded, not current acceptance.
- Historic missing RED output cannot be recreated. Task log must mark strict historical TDD evidence incomplete, retain current reproducible GREEN, and say clean-base rebuild is only way to recover strict-TDD process evidence.

## Final gates

```bash
npx playwright test e2e/smoke.spec.ts --grep "uses isolated E2E auth bootstrap"
npx playwright test e2e/smoke.spec.ts --grep "PIN login pre-auth acceptance"
npx playwright test e2e/smoke.spec.ts --grep "PIN login authenticated acceptance"
npx playwright test
npm test -- --run src/App.test.tsx src/auth/demo-auth-adapter.test.ts src/components/auth/PinLogin.test.tsx
npm test -- --run
npx tsc --noEmit
npm run build
git diff --check
grep -RInE 'demo-seed|DEMO_STAFF|DEMO_TENANT' e2e vite.e2e.config.ts playwright.config.ts
grep -RIn 'Fixture Manager\|tenant-e2e\|2468\|1357' dist
```

Expected scans: no production seed import in E2E; no fixture identifiers in `dist`.
