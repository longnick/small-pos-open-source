# Task: Task 1.12 strict verifier result

Date: 2026-08-01 08:45 UTC
Repo: `/home/longnick/projects/small-pos`
Branch: `main`
AI/Agent: Hermes Agent
User request: Repair verified fail-open verifier-return defect with strict TDD and one bounded commit.

## Goal

Make `verifyPin` fail closed unless injected verifier resolves exact boolean `true`.

## Files changed

- `packages/pos-core/src/auth.ts` — compares awaited verifier result with `true`.
- `packages/pos-core/test/auth.test.ts` — covers `undefined`, `"yes"`, `1`, and `{}` verifier results.
- `docs/ai-map/CHANGELOG_AI.md` — records repair.
- `docs/ai-map/FILE_RELATIONS.md` — updates focused coverage fact.
- `docs/ai-map/TASK_LOGS/2026-08-01-0810-task-1-12-rbac.md` — updates Task 1.12 final guard history.
- This task log — TDD and verification evidence.

## Decision

Use strict equality at injected trust boundary: `(await verifier(pin, pinHash)) === true`. No dependency, API, or policy change.

## Verification

- RED: `npm test -- packages/pos-core/test/auth.test.ts` → exit 1; four new cases received `undefined`, `"yes"`, `1`, and `{}` instead of `false`.
- GREEN: `npm test -- packages/pos-core/test/auth.test.ts` → PASS, 26 tests.
- `npm run ci:e2e` → PASS: `tsc --noEmit`, 14 unit files / 64 tests, Vite build, leakage scan, Playwright 3 tests.
- `git diff --check` → exit 0.

## Scope

No UI, DB, store, bcrypt, cloud, Notion, secrets, migrations, or POS data changed.

## Next step

Continue next approved Phase 1 task.
