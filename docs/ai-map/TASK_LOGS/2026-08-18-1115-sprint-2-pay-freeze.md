# Task: Sprint 2 freeze/TOCTOU/session restore CAS

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3`
Follow-up after Sol BLOCKED `1b0cb7b`.
AI/Agent: Hermes / gcli/grok-4.6

## What shipped

- Plan durable graph is deep-cloned and frozen. Store apply uses cloned copies, never plan references.
- Commit revalidates fingerprint of cloned table/order/payment/audits. Caller mutation between plan/commit is rejected.
- Occupied durable table must match local number/openedAt/id/tenant.
- Restore fail-closed on related malformed audit and forged `{sentAt}` details.
- App restore captures table+session before await; after await requires exact occupied binding. `applyRestoredOpenOrder` applies order+audits in one Zustand set.
- Session token checked before/after each store mutation. Subscriber sign-out rolls back exact precommit snapshot and does not write the new session.

## Not claimed

- Multi-tab Playwright.
- Menu/staff CRUD still later.

## Verification

Focused freeze/TOCTOU/restore/App. Then `npm run ci` and `npm run test:e2e:sell`.
