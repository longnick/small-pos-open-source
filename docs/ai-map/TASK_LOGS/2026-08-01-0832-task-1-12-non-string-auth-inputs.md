# Task: Task 1.12 non-string auth inputs

Date: 2026-08-01 08:32 UTC
Repo: `/home/longnick/projects/small-pos`
Branch: `main`
AI/Agent: Hermes Agent
User request: Repair two spec-review fail-closed runtime boundaries with strict TDD and one bounded commit.

## Goal

Reject non-primitive PIN hashes, roles, and actions before verifier, property, or regex access.

## Files changed

- `packages/pos-core/src/auth.ts` — adds primitive non-empty hash guard; adds primitive role/action guards before permission lookup and regex.
- `packages/pos-core/test/auth.test.ts` — adds numeric and boxed hash regressions; Symbol and boxed action regressions.
- `docs/ai-map/FILE_RELATIONS.md` — updates focused auth coverage fact.
- `docs/ai-map/TASK_LOGS/2026-08-01-0810-task-1-12-rbac.md` — records final guard history.
- `docs/ai-map/CHANGELOG_AI.md` — records completion.
- This task log — TDD and verification evidence.

## Decisions made

- Preserved public signatures and role/action policy.
- Used `typeof` guards only; no dependency or abstraction added.
- Unknown or non-primitive role/action inputs fail closed before `Object.hasOwn` or `RegExp.test`.

## Verification

- RED: `npx vitest run packages/pos-core/test/auth.test.ts` → exit 1; Symbol action threw `TypeError`, boxed action returned `true`, numeric and boxed hashes resolved `true`.
- GREEN: `npx vitest run packages/pos-core/test/auth.test.ts` → `PASS (22) FAIL (0)`.
- `npm run ci:e2e` → PASS: `tsc --noEmit`, 14 unit files / 60 tests, Vite build, leakage scan, Playwright 3 tests.
- `git diff --check` → exit 0.

## Scope

No UI, DB, store, bcrypt, cloud, Notion, secrets, migrations, or POS data changed.

## Next step

Continue next approved Phase 1 task.
