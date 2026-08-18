# Task: Sprint 2 fail-closed target audit across tenant filtering

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3`
Follow-up after Sol BLOCKED `adc72a4`.
AI/Agent: Hermes / gcli/grok-4.6

## What shipped

- Restore loads all local `auditLog` rows inside existing readonly transaction.
- Target relevance remains `entityId === orderId` or canonical `send:{orderId}`.
- Every target-related row must pass full audit schema, `entityType:'order'`, exact target entity ID, and exact authenticated tenant. Otherwise restore returns null.
- Other-order rows, including cross-tenant payment audit, are ignored.

## Verification

Focused persist-send/dexie-restore. Then `npm run ci` and `npm run test:e2e:sell`.
