# Task: Sprint 2 exact rollback + audit/table graph + one-txn restore

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3`
Follow-up after Sol BLOCKED `e6350fa`.
AI/Agent: Hermes / gcli/grok-4.6

## What shipped

- `PayReconcilePlan` captures immutable local snapshots: currentOrder, payments, audits, lastReceipt, tenant, tables, exact table row, optional sessionToken.
- Commit rechecks exact local CAS. Table apply fail or post-apply table mismatch restores exact snapshots.
- Audit graph: open predecessor 0 send + 0 payment audits; sent predecessor exactly one `send:{orderId}`; winner one payment audit + send iff sent predecessor.
- `applyDurablePaySnapshot` requires `isAuditRecord`.
- Durable table: safe integer number/openedAt; empty has no currentOrderId; occupied exact bind/staff.
- `loadRestoredOrderForTable` one readonly Dexie txn (orders+auditLog). Sent without canonical send audit is null.
- App restore captures sessionToken/tenant/staff/persist before await and rechecks after. Logout/relogin does not apply.

## Not claimed

- Multi-tab Playwright.
- Menu/staff CRUD still later.

## Verification

Focused reconcile/restore/App. Then `npm run ci` and `npm run test:e2e:sell`.
