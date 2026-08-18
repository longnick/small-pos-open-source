# Task: Sprint 2 pay reconcile fail-closed + session token

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3`
Follow-up after Sol BLOCKED `53f21a2`.
AI/Agent: Hermes / gcli/grok-4.6

## What shipped

- `reconcileLocalPayFromDurable` returns `{kind: predecessor|winner|rejected}`. Winner only after both table+order atomic apply succeed.
- System reconcile via `applyDurablePaySnapshot` / `applyDurableTable`. No RBAC. Rebound table (`occupied` other order) rejected, untouched.
- Winner graph: empty table, paid order same tenant/table/staff + paidAt, exactly one payment matching total/timestamp/tender, exactly one payment.recorded audit matching details. Extra payment audit = rejected.
- `sessionToken` increments on login/logout/tenant switch, including same-staff re-login. App captures token before await; token change suppresses receipt and does not mutate the new session.
- After durable commit, `releaseTable` fail loads durable snapshot and applies CAS. Rebound table stays occupied. No force-empty.
- `loadDurablePaySnapshot` returns `{kind:ok|corrupt}` or null. Malformed/cross-tenant related payment/audit is corrupt, never filtered to empty.

## Not claimed

- Multi-tab Playwright. Unit/App covers rebound + token.
- Menu/staff CRUD still later.

## Verification

Focused reconcile/auth/persist/App. Then `npm run ci` and `npm run test:e2e:sell`.
