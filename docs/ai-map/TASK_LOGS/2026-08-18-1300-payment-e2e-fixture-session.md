# Task: Canonical payment E2E fixture session regression

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `a753951`
Follow-up: PR #39 `npm run test:e2e:payment` failed.
AI/Agent: Hermes / gcli/grok-4.6

## Root cause

Auth session generation correctly clears POS state. Payment E2E uses an intentionally non-persistent `bootstrapDemoPos` fixture. After sign-in, its staged open order was cleared and an occupied table cannot restore from Dexie, so click never set selection.

## Fix

Retain bootstrapped non-persistent demo fixture in App. After successful sign-in, reapply it only when fixture order belongs to authenticated staff. Persistent sessions remain untouched. Initialize selection effect token synchronously, so its initial passive effect does not clear a click.

## Verification

RED: exact `npm run test:e2e:payment` failed Bàn 1 `aria-pressed=false`.
GREEN: exact payment E2E passed. App suite, CI, sell E2E follow.
