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
  - role: defines shared POS domain records, including tenant-tagged `CatalogGroup`, `CatalogItem`, and `PosTable`.
  - depends on: none.
  - used by: core modules and Zustand stores.

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
  - notes: no raw PIN state; candidate `pinHash` stays within transient core verification call. Tenant changes and sign-out invalidate pending sign-ins; only latest verified sign-in for unchanged captured tenant/session can set staff.

- `src/stores/tenant-auth-store.test.ts`
  - role: covers tenant changes, tenant-match sign-in guard, stale/latest async sign-in boundaries, rejected sign-in session preservation, sign-out, and RBAC delegation.
  - depends on: `src/stores/tenant-auth-store.ts`.
  - used by: Vitest.

## Module: Catalog and table store

Purpose: keep transient tenant-scoped catalog and table data only after full input validation.

Related files:

- `src/stores/catalog-table-store.ts`
  - role: exports `useCatalogTableStore` Zustand React hook with atomic `replaceTenantData`, `clear`, sorted available-item lookup, and table lookup.
  - depends on: `packages/pos-core/src/types.ts`.
  - used by: future catalog/table UI adapters; no current UI, Dexie persistence/hydration, CRUD, tenant/auth-store coupling, raw seed conversion, or order-flow wiring in Task 2.2.
  - notes: replacement rejects malformed or hostile runtime input before `set`, copies validated records, and preserves existing state on rejection. Read helpers return copies after filtering/sorting or lookup.

- `src/stores/catalog-table-store.test.ts`
  - role: covers atomic valid replacement, caller-record and returned-record isolation, fail-closed hostile/malformed validation with state preservation, clearing, available item sorting/non-mutation, and table lookup.
  - depends on: `src/stores/catalog-table-store.ts` and POS core domain types.
  - used by: Vitest.

## Module: POS core

- `packages/pos-core/src/order-calc.ts`, `shift-report.ts`, `event-bus.ts`
  - role: independent typed domain utilities.
  - depends on: `packages/pos-core/src/types.ts` where needed.
  - used by: unit tests and future application adapters.
