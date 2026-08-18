# Task: Sprint 2 session clear + required token + restore staff graph

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3`
Follow-up after Sol BLOCKED `3cc2231`.
AI/Agent: Hermes / gcli/grok-4.6

## What shipped

- Auth token generation (login/logout/tenant switch) synchronously clears POS order/payments/audits/receipt via `session-hooks` + `clearSessionState`. No leftover pay-1 after same-staff relogin mid-commit.
- Restore requires `expectedStaffId`. Loader validates `order.staffId` in the same readonly txn. App rechecks table.staffId === authenticated staff.id === restored.order.staffId.
- `sessionToken` is required on plan/reconcile APIs. Missing token is rejected.

## Not claimed

- Multi-tab Playwright.
- Menu/staff CRUD still later.

## Verification

Focused session/restore/App. Then `npm run ci` and `npm run test:e2e:sell`.
