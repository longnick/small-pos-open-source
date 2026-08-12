# Task: Task 2.5 clean release reconstruction and review

Date: 2026-08-12 01:10 UTC
Repo: `/home/longnick/projects/small-pos-release-task25`
Branch: `release/task-2-5-pin-login`
Agent: Hermes
User request: Continue approved Task 2.5 after Strict Slice E verification.

## Before state

- Dirty source worktree: `/home/longnick/projects/small-pos`, on `main` at `b97577d`.
- Dirty source mixed Task 2.4 and Task 2.5 files. It was never reset, stashed, cleaned, committed, or deployed.
- Existing release worktree had no Task 2.5 commit and no `node_modules`.
- Scoped recovery backup created before materialization:
  `/home/longnick/backups/small-pos-task25-release-20260812-010647`

## Goal

Reconstruct only Task 2.5 into an isolated reviewable worktree, rerun gates there, and leave unrelated Task 2.4 outside the release unit.

## Included paths

- App/login boundary: `src/App.tsx`, `src/App.test.tsx`, `src/auth/*`, `src/components/auth/*`, `src/vitest-extended.d.ts`
- Isolated E2E boundary: `e2e/smoke.spec.ts`, `e2e/fixtures/test-auth-adapter.ts`, `vite.e2e.config.ts`, `playwright.config.ts`
- Test resolver: `vitest.config.ts`
- Task 2.5 AI-map docs, screenshots, and release log.

## Excluded paths

- All Task 2.4 source/tests/logs/guides.
- `.env`, credentials, database, migration, POS data, package manifest, lockfile, and normal Vite configuration.

## Decisions

- Source dirty worktree remains recovery evidence only.
- E2E fixture is a separate Vite alias override, never normal production build input.
- Historical interrupted RED/GREEN evidence was not fabricated. This log records current clean-worktree gate evidence.

## Verification

Fresh dependency setup:

```text
npm ci --ignore-scripts --no-audit: PASS
```

Focused unit:

```text
3 files, 53/53 PASS
```

Full unit:

```text
21 files, 253/253 PASS
```

TypeScript:

```text
node node_modules/typescript/bin/tsc --noEmit --pretty false: PASS
```

Build:

```text
node node_modules/vite/bin/vite.js build: PASS
1758 modules transformed
```

Leakage/self-test and whitespace:

```text
node scripts/scan-leakage.mjs: PASS
node scripts/scan-leakage.mjs --self-test: PASS
git diff --check: PASS
normal dist fixture scan: PASS
```

Playwright, isolated E2E server:

```text
E-1 workers=1: PASS 3
E-1 workers=2: PASS 3
E-1..E-6 workers=2: PASS 7, FAIL 0, SKIP 8
Full smoke: PASS 10, FAIL 0, SKIP 8
```

## Scope review

- No Task 2.4 path appears in candidate source diff.
- No Dexie, persistence, routing, event bus, package, lockfile, seed, or normal Vite config change.
- Normal built `dist` contains none of `Fixture Manager`, `tenant-e2e`, `2468`, or `1357`.

## Remaining issues

- Commit not yet created at time of this log.
- Merge and deploy require owner approval after committed-unit review.

## Next step

Stage only enumerated Task 2.5 paths, verify staged scope, commit release unit, then report merge readiness. Do not deploy.

## Safety notes

No secrets, database, migration, POS data, raw media, package manifest, or lockfile were touched.
No deploy, reset, stash, clean, force push, or remote mutation was run.
