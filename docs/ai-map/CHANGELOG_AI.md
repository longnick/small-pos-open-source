# AI Changelog

## 2026-08-01 08:10 - Task 1.12 PIN auth and RBAC

Repo: `/home/longnick/projects/small-pos`
Branch: `main`
Agent: Hermes Agent
Summary: Added injected PIN hash verification with contained verifier failures and fail-closed role action guard.
Files changed: `packages/pos-core/src/auth.ts`, `packages/pos-core/test/auth.test.ts`, AI map files.
Verification: targeted `auth.test.ts` passed 17 tests; `npm run ci:e2e` passed 55 unit tests and 3 Playwright tests; `git diff --check` passed.
Next: wire authentication into later UI/store phase only when planned.
Task log: `docs/ai-map/TASK_LOGS/2026-08-01-0810-task-1-12-rbac.md`
