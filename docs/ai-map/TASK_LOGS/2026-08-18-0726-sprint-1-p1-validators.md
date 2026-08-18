# Task: Sprint 1 Sol P1/P2 follow-up

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-fe974674`
Branch: `feat/sprint-1-product-bootstrap`
Parent: `73f18bf`
AI/Agent: Hermes / gcli/grok-4.6
Reviewer: `cx/gpt-5.6-sol` still BLOCKED on `73f18bf`

## Fixes

P1.1 Shared `packages/pos-core/src/product-records.ts` used by backup import and setup-state. Full tenant/staff/appConfig/table/group/item shapes, unique IDs/numbers, tenant scope, group refs, status/staffId/openedAt. Near-valid malformed payloads reject with all 10 stores row-equivalent.

P1.2 `isValidPinHash` requires exact `v1$<16-byte b64>$<32-byte b64>`. Rejects `v1$` and `v1$AA==$AA==` in backup and ready-state. Recovery unit test verifies restored PIN.

P2 Removed unused `node:path` from `e2e/recovery.spec.ts`.

## RED / GREEN

- group missing sortOrder imported → now reject, 10 stores equal
- table missing status/staffId/openedAt imported → now reject
- item missing available/timestamps imported → now reject
- pinHash `v1$` / short b64 stayed ready or imported → now corrupt/reject
- recovery verifier after import: 5821 true, 0000 false

## Verification

- focused: 31 pass
- oxlint changed files: ok
- `npm run ci`: 524 pass + typecheck + build + leakage
- `npm run test:e2e:first-run`: 6/6

## Next

Sol re-review. No push/merge/deploy.
