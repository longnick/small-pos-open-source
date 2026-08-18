# Task: Sprint 1 compatibility and order timestamp invariants

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-fe974674`
Branch: `feat/sprint-1-product-bootstrap`
Parent: `81bc45c`
AI/Agent: Hermes / gcli/grok-4.6
Reviewer: `cx/gpt-5.6-sol` BLOCKED on `81bc45c`

## Fixes

1. Order status/time: `sentAt`/`paidAt`/`cancelledAt` must be `>= createdAt`.
   Combinations: open has none; sent has sentAt only; paid has paidAt and no cancelledAt;
   cancelled has cancelledAt and no paidAt.
2. Recovery accepts historical payment without `tender` if amount/order match.
   Present tender still enforces cash `>=` / non-cash exact. `recordPayment` still requires tender.
3. Historical `OrderItem.catalogItemId` is a nonempty snapshot ID. Current catalog membership not required.
4. Success import seeds nonempty data in all 10 stores and asserts exact row equality after replace.
5. Adversarial: paidAt before createdAt; paid+cancelledAt. Both reject, 10 stores unchanged.

## RED / GREEN

- paidAt < createdAt imported → now reject
- paid+cancelledAt imported → now reject
- legacy payment without tender + retired SKU rejected → now import, rows equal
- success import already passed on empty ops stores; now nonempty 10-store equality

## Lint

`oxlint -c .oxlintrc.json src packages e2e scripts` exit 0.
Preexisting unused-var / only-export-components warnings remain. Not deny-warnings.

## Verification

- focused backup + payment store: 57 pass
- `npm run ci`: typecheck + oxlint + 533 tests + build + leakage
- `npm run test:e2e:first-run`: 6/6

## Next

Sol re-review. No push/merge/deploy.
