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

## Application stores

- `src/stores/tenant-auth-store.ts` — Zustand tenant/current-staff session hook; delegates PIN and RBAC rules to POS core.

## Commands

- `npm test` — unit tests.
- `npm run ci:e2e` — typecheck, unit tests, build, leakage scan, Playwright smoke tests.
