# Task: Task 1.12 non-string PIN guard

Date: 2026-08-01 08:20 UTC
Repo: `/home/longnick/projects/small-pos`
Branch: `main`
AI/Agent: Hermes Agent
User request: Fix spec-review defect with strict TDD and one bounded commit.

## Before state

- Existing branch: `main` at `10f951083a30a8ff4f20a4a9f93a8cb107aa872f`.
- Existing uncommitted files: none.
- Relevant AI map files read: `docs/ai-map/CODE_MAP.md`, `docs/ai-map/FILE_RELATIONS.md`, `docs/ai-map/CHANGELOG_AI.md`, `docs/ai-map/TODO_AI.md`.
- Relevant source files read: `packages/pos-core/src/auth.ts`, `packages/pos-core/test/auth.test.ts`.

## Goal

Sửa `verifyPin` để runtime input không phải string bị từ chối trước regex và không gọi verifier.

## Files changed

- `packages/pos-core/src/auth.ts` — thêm runtime `typeof pin !== "string"` fail-closed guard.
- `packages/pos-core/test/auth.test.ts` — thêm numeric PIN boundary regression test.
- `docs/ai-map/FILE_RELATIONS.md` — cập nhật test coverage note.
- `docs/ai-map/CHANGELOG_AI.md` — ghi completion.
- `docs/ai-map/TODO_AI.md` — ghi completion link.
- This task log — TDD and verification evidence.

## Code relations

- `packages/pos-core/test/auth.test.ts` calls `verifyPin` from `packages/pos-core/src/auth.ts`.
- `verifyPin` validates input before injected verifier runs.
- No UI, DB, store, bcrypt, cloud, or Notion integration changed.

## Decisions made

- Preserved public `verifyPin(pin: string, ...)` signature.
- Added one runtime type check before regex because TypeScript casts do not protect runtime input.
- No dependency or abstraction added.

## Verification

- RED: `npx vitest run packages/pos-core/test/auth.test.ts` → exit 1; numeric PIN test failed: `expected true to be false` at `auth.test.ts:81`.
- GREEN: `npx vitest run packages/pos-core/test/auth.test.ts` → `PASS (18) FAIL (0)`.
- `npm run ci:e2e` → PASS: `tsc --noEmit`, 14 unit files / 56 tests, Vite build, leakage scan, Playwright 3 tests.
- `git diff --check` → exit 0.

## Remaining issues

- None in bounded defect scope.
- Notion update not attempted. No credentials or UI access used.

## Next step

Continue next approved Phase 1 task.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
