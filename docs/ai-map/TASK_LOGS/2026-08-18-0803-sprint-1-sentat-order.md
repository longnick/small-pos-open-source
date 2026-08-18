# Task: Sprint 1 sentAt ordering + untracked E2E screenshots

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-fe974674`
Branch: `feat/sprint-1-product-bootstrap`
Parent: `18249c9`
AI/Agent: Hermes / gcli/grok-4.6
Reviewer: `cx/gpt-5.6-sol` BLOCKED on `18249c9`

## Fixes

1. If `sentAt` exists, `paidAt`/`cancelledAt` must be `>= sentAt`. Keep `>= createdAt` and status combinations.
2. Smoke/visual E2E screenshots write to `test-results/e2e-screenshots` (already gitignored). Historical `docs/ai-map/TASK_LOGS/*.png` stay untouched.

## RED / GREEN

- paid `sentAt: 100, paidAt: 8` imported → now reject, all 10 stores equal
- cancelled `sentAt: 20, cancelledAt: 8` imported → now reject, all 10 stores equal

## Lint

`oxlint -c .oxlintrc.json src packages e2e scripts` exit 0. Preexisting unused-var / only-export-components warnings remain. Not deny-warnings.

## Verification

- focused backup + product-records: 27 pass
- `npm run ci`: typecheck + oxlint + 535 tests + build + leakage
- `npm run test:e2e:first-run`: 6/6
- `git status` after gates: only intended source files; no tracked PNG dirty

## Next

Sol re-review. No push/merge/deploy.
