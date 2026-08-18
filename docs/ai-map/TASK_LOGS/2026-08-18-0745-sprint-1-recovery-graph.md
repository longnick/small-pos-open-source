# Task: Sprint 1 recovery graph 10-store prevalidation

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-fe974674`
Branch: `feat/sprint-1-product-bootstrap`
Parent: `a73c89f`
AI/Agent: Hermes / gcli/grok-4.6
Reviewer: `cx/gpt-5.6-sol` BLOCKED on `a73c89f`

## Fixes

Import now runs `isProductViableBackupData` on all 10 stores before any clear/write.
Shared validators cover orders/payments/shifts/auditLog: own data, required fields,
safe-integer money/timestamps/qty, unique IDs, tenant/staff/table/order/catalog refs,
recomputed order totals, paid-order/payment consistency, shift lifecycle, audit details.
Graph: table.staffId exists; occupied/waiting table.currentOrderId exists and matches
tenant/table; empty table has no currentOrderId; open order must be bound.
Hydrate reuses tenant/group/item/table record checkers. Lint script is real oxlint
and `npm run ci` runs it.

## RED / GREEN

Operational payload with all 10 stores nonempty imported until graph checks existed:
- order total 1 imported → now reject, 10 stores equal
- payment amount 1 imported → now reject
- occupied table missing currentOrderId imported → now reject
- empty table bound to open order imported → now reject
- shift closedAt < openedAt imported → now reject
- audit details array imported → now reject

## Verification

- focused backup/setup/hydrate/recovery: 50 pass
- `npx oxlint -c .oxlintrc.json src packages e2e scripts`: exit 0 (preexisting unused-var warnings only)
- `npm run ci`: typecheck + oxlint + 530 tests + build + leakage
- `npm run test:e2e:first-run`: 6/6 including semantic malformed recovery JSON

## Next

Sol re-review. No push/merge/deploy.
