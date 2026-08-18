# Task: Sprint 2 reset selected table on sessionToken

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3`
Follow-up after Sol BLOCKED `4fa8a4a`.
AI/Agent: Hermes / gcli/grok-4.6

## What shipped

- PosShell `useEffect` keyed on `sessionToken` clears `selectedTableId`.
- Rendered highlight/order binding uses `selectionToken === sessionToken` so a stale selection cannot paint after same-staff relogin.
- App test: select occupied table, seed payment/audit/receipt, same-staff signIn without unmount. POS state empty and Bàn 1 not pressed. Catalog tables stay.

## Not claimed

- Menu/staff CRUD still later.

## Verification

Focused App same-staff relogin. Then `npm run ci` and `npm run test:e2e:sell`.
