# AI TODO

## Doing

None.

## Next

- Continue approved Phase 2 task after Task 2.2.
- Keep catalog/table store in-memory and independently loaded; add UI, Dexie hydration, CRUD, and tenant/auth coupling only in approved later tasks.
- Keep `verifyPin` adapter-injected; add bcrypt/cloud adapter only when persistence/auth integration phase requires it.

## Blocked

- Notion public/integration unavailable. Task 2.2 record only; no auth attempt.

## Risks

- Tenant/auth and catalog/table stores remain in-memory only; no UI, DB, Dexie hydration, raw seed conversion, order flow, or tenant/auth-store coupling by Task 2.2 scope.

## Done recently

- Task 2.2 catalog and table Zustand store — `docs/ai-map/TASK_LOGS/2026-08-01-1054-task-2-2-catalog-table-store.md`
- Task 2.1 tenant auth session boundaries — `docs/ai-map/TASK_LOGS/2026-08-01-1040-task-2-1-auth-boundaries.md`
- Task 2.1 tenant and auth Zustand store — `docs/ai-map/TASK_LOGS/2026-08-01-1020-task-2-1-tenant-auth-store.md`
- Task 1.12 non-string PIN guard — `docs/ai-map/TASK_LOGS/2026-08-01-0820-task-1-12-non-string-pin-guard.md`
- Task 1.12 PIN auth and RBAC — `docs/ai-map/TASK_LOGS/2026-08-01-0810-task-1-12-rbac.md`
