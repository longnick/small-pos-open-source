# File Relations

## Module: Core authentication and authorization

Purpose: validate staff PIN through injected hash verifier and enforce POS action permissions.

Related files:

- `packages/pos-core/src/auth.ts`
  - role: exports `verifyPin` and `canAccess`.
  - depends on: `packages/pos-core/src/types.ts` for `Role`.
  - used by: future login/action adapters; no UI, DB, or storage wiring in Phase 1.
  - notes: verifier is injected; bcrypt and cloud sync remain out of scope.

- `packages/pos-core/src/types.ts`
  - role: defines `Role` and staff `pinHash` contract.
  - depends on: none.
  - used by: `packages/pos-core/src/auth.ts` and core modules.

- `packages/pos-core/test/auth.test.ts`
  - role: covers PIN validation/failure containment and RBAC policy.
  - depends on: `packages/pos-core/src/auth.ts`.
  - used by: Vitest.
  - notes: 18 cases cover roles, wildcards, malformed/non-string PIN inputs, sync/async verifiers, and failure paths.

## Module: POS core

- `packages/pos-core/src/order-calc.ts`, `shift-report.ts`, `event-bus.ts`
  - role: independent typed domain utilities.
  - depends on: `packages/pos-core/src/types.ts` where needed.
  - used by: unit tests and future application adapters.
