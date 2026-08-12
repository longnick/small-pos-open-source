# AI TODO

## Doing

- Task 2.9: minimal local read-only payment modal passed executable gates. Full payment execution is excluded; screenshot pixel inspection is blocked by vision-provider credit. Commit/owner handoff remains. No deploy.

## Next

- Commit Task 2.9 from the release worktree after final scope review, then request owner visual QA/merge approval.
- Full payment lifecycle: explicit approval required for `recordPayment`, identity/time/receipt/audit, error/retry semantics, paid state, and table/order lifecycle coupling.
- Keep all stores in-memory until approved Dexie hydration phase.
- Keep `verifyPin` adapter-injected; add bcrypt/cloud adapter only when persistence/auth integration phase requires it.

## Blocked

- Notion public/integration unavailable. Task 2.4 record only; no auth attempt.

## Risks

- All four stores remain in-memory only; no UI, DB, Dexie hydration, raw seed conversion, or inter-store coupling beyond what each task's scope allows.

## Done recently

- Task 2.5 PIN Login — `docs/ai-map/TASK_LOGS/2026-08-08-0832-task-2-5-pin-login.md` (implementation/gates verified; strict historical TDD evidence partially interrupted by Kiro rate limit and Luna tool stall).
- Task 2.4 shift and audit Zustand store — `docs/ai-map/TASK_LOGS/2026-08-08-0758-task-2-4-strict-tdd.md`
- Task 2.3 order and payment Zustand store — `docs/ai-map/TASK_LOGS/2026-08-02-0928-task-2.3.md`
- Task 2.2 catalog/table ownership and hostile input safety — `docs/ai-map/TASK_LOGS/2026-08-01-1115-task-2-2-ownership-input-safety.md`
- Task 2.2 catalog and table Zustand store — `docs/ai-map/TASK_LOGS/2026-08-01-1054-task-2-2-catalog-table-store.md`
- Task 2.1 tenant auth session boundaries — `docs/ai-map/TASK_LOGS/2026-08-01-1040-task-2-1-auth-boundaries.md`
- Task 2.1 tenant and auth Zustand store — `docs/ai-map/TASK_LOGS/2026-08-01-1020-task-2-1-tenant-auth-store.md`
