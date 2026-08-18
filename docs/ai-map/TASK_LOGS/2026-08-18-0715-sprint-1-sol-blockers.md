# Task: Sprint 1 Sol BLOCKED fixes

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-fe974674`
Branch: `feat/sprint-1-product-bootstrap`
Parent: `8dc061c`
AI/Agent: Hermes / gcli/grok-4.6
Reviewer: `cx/gpt-5.6-sol` BLOCKED on `8dc061c`

## Fixes

1. Import prevalidates product-viable v2 payload before any clear/write.
2. Version-1 backups throw `unsupported-for-product-bootstrap` with no mutation.
3. Recovery E2E: corrupt DB → bad file leaves rows → good v2 → login/reload.
4. Chromium proof: native Dexie v1 IDB 10 upgrades to IDB 20, tenant kept.
5. `npm run test:e2e:first-run` + `verify:release` + CI step.
6. PIN 4-digit/local-only + backup `pinHash` risk documented. In-memory 5/60s throttle.

## RED / GREEN

- v1 import resolved; now rejects `unsupported-for-product-bootstrap`
- empty v2 import resolved; now rejects `backup-not-product-viable`
- ready USD / unversioned pinHash stayed ready; now corrupt
- throttle module missing; now 5 then block
- schema upgrade expected Dexie 2, got IDB 20; assert IDB 20 after v1=10 seed

## Verification

- focused unit/component: 96 pass
- `npm run ci`: 516 pass + typecheck + build + leakage
- `npm run test:e2e:first-run`: 6/6 (390 + 768)

## Next

Re-review Sol. No push/merge/deploy.
