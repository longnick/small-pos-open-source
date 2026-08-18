# Task: Sprint 2 sessionToken pass + no restore into new session

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3`
Follow-up after Sol BLOCKED `1bb8e4b`.
AI/Agent: Hermes / gcli/grok-4.6

## What shipped

- App passes `startedToken` into every `reconcileLocalPayFromDurable`.
- Commit restores old snapshot only when current token still equals expected. Subscriber signOut mid-apply leaves leftover winner/order mutation and does not write old pay-loser/table/tenant into the new session.
- Restore table CAS compares id, tenantId, staffId, status, currentOrderId, number, openedAt.
- Restore open/sent rejects any `payment.recorded` audit. Canonical send cardinality stays exact.
- Plan object is frozen. Fingerprint remains a mutation detector for cloned plan fields.

## Not claimed

- Multi-tab Playwright.
- Menu/staff CRUD still later.

## Verification

Focused session/restore/App. Then `npm run ci` and `npm run test:e2e:sell`.
