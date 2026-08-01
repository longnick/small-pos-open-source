# File Relations

## Module: Core authentication and authorization

Purpose: validate staff PIN through injected hash verifier and enforce POS action permissions.

Related files:

- `packages/pos-core/src/auth.ts`
  - role: exports `PinHashVerifier`, `verifyPin`, and `canAccess`.
  - depends on: `packages/pos-core/src/types.ts` for `Role`.
  - used by: `src/stores/tenant-auth-store.ts` plus future login/action adapters; no UI, DB, or storage wiring in Phase 2 Task 2.1.
  - notes: verifier is injected; bcrypt and cloud sync remain out of scope.

- `packages/pos-core/src/types.ts`
  - role: defines `Role` and staff `pinHash` contract.
  - depends on: none.
  - used by: `packages/pos-core/src/auth.ts` and core modules.

- `packages/pos-core/test/auth.test.ts`
  - role: covers PIN validation/failure containment and RBAC policy.
  - depends on: `packages/pos-core/src/auth.ts`.
  - used by: Vitest.
  - notes: 26 cases cover roles, wildcards, malformed/non-primitive PIN hashes/actions, strict boolean verifier results, sync/async verifiers, and failure paths.

## Module: Tenant and auth store

Purpose: keep transient tenant/current-staff application state and delegate authentication/authorization to POS core.

Related files:

- `src/stores/tenant-auth-store.ts`
  - role: exports `useTenantAuthStore` Zustand React hook with tenant, staff, sign-in/out, and authorization state operations.
  - depends on: `packages/pos-core/src/types.ts` and `packages/pos-core/src/auth.ts`.
  - used by: future UI/auth adapters; no PIN UI, Dexie persistence/hydration, or storage wiring in Task 2.1.
  - notes: no raw PIN state; candidate `pinHash` stays within transient core verification call.

- `src/stores/tenant-auth-store.test.ts`
  - role: covers tenant changes, async sign-in, rejected sign-in session preservation, sign-out, and RBAC delegation.
  - depends on: `src/stores/tenant-auth-store.ts`.
  - used by: Vitest.

## Module: POS core

- `packages/pos-core/src/order-calc.ts`, `shift-report.ts`, `event-bus.ts`
  - role: independent typed domain utilities.
  - depends on: `packages/pos-core/src/types.ts` where needed.
  - used by: unit tests and future application adapters.
