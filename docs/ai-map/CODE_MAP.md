# Code Map

## Core domain

- `packages/pos-core/src/types.ts` — shared POS domain types.
- `packages/pos-core/src/auth.ts` — PIN verifier boundary and role-based permission guard.
- `packages/pos-core/src/order-calc.ts` — order total calculation.
- `packages/pos-core/src/shift-report.ts` — shift report calculation.
- `packages/pos-core/src/event-bus.ts` — typed domain event dispatch.

## Tests

- `packages/pos-core/test/*.test.ts` — Vitest unit tests for core behavior.
- `src/stores/tenant-auth-store.test.ts` — Vitest unit tests for tenant/auth store behavior.
- `src/stores/catalog-table-store.test.ts` — Vitest unit tests for catalog/table store validation and read helpers.

## Application stores

- `src/stores/tenant-auth-store.ts` — Zustand tenant/current-staff session hook; delegates PIN and RBAC rules to POS core.
- `src/stores/catalog-table-store.ts` — Zustand tenant-scoped catalog groups, catalog items, and tables hook; atomically accepts internally consistent input only.
- `src/stores/order-payment-store.ts` — Zustand in-memory open order + payment list hook; fail-closed validation on all mutations; pure order-calc delegation. (Task 2.3)
- `src/stores/shift-audit-store.ts` — Zustand in-memory current shift + audit log hook; openShift/closeShift/appendAudit/auditsForEntity with full descriptor-scan + structuredClone boundary hardening. (Task 2.4)

## Tests

- `packages/pos-core/test/*.test.ts` — Vitest unit tests for core behavior.
- `src/stores/tenant-auth-store.test.ts` — Vitest unit tests for tenant/auth store behavior.
- `src/stores/catalog-table-store.test.ts` — Vitest unit tests for catalog/table store validation and read helpers.
- `src/stores/order-payment-store.test.ts` — Vitest unit tests for order/payment store mutations, isolation, and fail-closed boundary. (Task 2.3)
- `src/stores/shift-audit-store.test.ts` — 56 Vitest unit tests across 4 TDD slices: openShift, closeShift, audit API, trust/ownership boundary. (Task 2.4)
- `src/auth/demo-auth-adapter.ts` — in-memory Web Crypto PBKDF2 adapter from demo seed to core tenant/staff/verifier; no persistence. (Task 2.5)
- `src/auth/demo-auth-adapter.test.ts` — adapter mapping, verification, malformed-hash, and raw-PIN boundary tests. (Task 2.5)
- `src/components/auth/PinLogin.tsx` — accessible staff-select and masked PIN screen; no seed/store knowledge. (Task 2.5)
- `src/components/auth/PinLogin.test.tsx`, `src/App.test.tsx` — login behavior and fail-closed shell-gate tests. (Task 2.5)

## Commands

- `npm test` — unit tests.
- `npm run ci:e2e` — typecheck, unit tests, build, leakage scan, Playwright smoke tests.
- `.github/ISSUE_TEMPLATE/` — Bug, Feature, Documentation forms. New issues get `needs-triage`.
