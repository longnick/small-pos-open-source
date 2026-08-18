# Task: Sprint 2 pay durable-authority reconciliation

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3`
Follow-up after Sol BLOCKED `b6722f6`.
AI/Agent: Hermes / gcli/grok-4.6

## What shipped

- `persistAfterPay` returns typed `{kind: committed|idempotent|conflict|io-error|invalid}`.
- Idempotent only when table+order+payment+audit all exact. Table mismatch is conflict; no rewrite on retry.
- Tender trust-boundary: safe integer; cash `tender>=amount` and safe change; noncash `tender===amount`. Underpay/over-tender/overflow = invalid.
- Conflict/io-error/invalid: `loadDurablePaySnapshot` then `reconcileLocalPayFromDurable`. Restore predecessor only when durable occupied + same order + zero payment. Winner paid+empty adopted; no repay; loser receipt suppressed.
- Auth/session change during await: reconcile durable, no receipt.
- Local `releaseTable` fail after commit still forces empty table.
- Broadcast still hydrates catalog/tables; pay outcome itself is typed, not boolean.

## Not claimed

- Multi-tab Playwright browser proof. Unit/integration covers two Dexie connections + App UI reconcile.
- Kitchen queue / menu CRUD still later.

## Verification

Focused persist/reconcile/App/PaymentModal. Then `npm run ci` and `npm run test:e2e:sell`.
