# Task: Sprint 2 restore audit relevance by entityId

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3`
Follow-up after Sol BLOCKED `0c1c9c1`.
AI/Agent: Hermes / gcli/grok-4.6

## What shipped

- `loadRestoredOrderForTable` treats an audit as related only when `entityId` is the restored order, or the row id is canonical `send:{orderId}`.
- Tenant-wide `payment:*` rows for other orders are ignored.
- Malformed/forged audit with this order `entityId` still fail-closed.

## Not claimed

- Menu/staff CRUD still later.

## Verification

Focused persist-send/dexie-restore. Then `npm run ci` and `npm run test:e2e:sell`.
