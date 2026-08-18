# Task: Sprint 2 atomic pay plan/commit + snapshot table corrupt

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3`
Follow-up after Sol BLOCKED `ab682e6`.
AI/Agent: Hermes / gcli/grok-4.6

## What shipped

- `planPayReconcile` / `commitPayReconcile`: prevalidate durable graph + local CAS, no mutation in plan. Commit applies order first then table; table fail rolls order back to predecessor.
- Empty-table apply rejects waiting_payment, occupied missing bind, or any nonempty bind not exact attempted order.
- Durable order validator: own items, unique line IDs, recomputed totals, paidAt>=created/sent, paid order only status/paidAt vs predecessor.
- `loadDurablePaySnapshot`: existing table malformed/cross-tenant is `{kind:corrupt}`, not null.
- Session token checked after every `loadDurablePaySnapshot` and before reconcile/receipt. Same-staff relogin during snapshot load does not reconcile.
- Winner reconcile sets `lastReceipt` null. Receipt only from local committed/idempotent persist.

## Not claimed

- Multi-tab Playwright.
- Menu/staff CRUD still later.

## Verification

Focused plan/commit/table/snapshot/App. Then `npm run ci` and `npm run test:e2e:sell`.
