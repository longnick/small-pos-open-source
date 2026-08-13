# AI TODO

## Doing

- StaffManagement shift `aria-pressed` — Sol APPROVE. Remaining: PR + owner review. No deploy.

## Next

- After this docs PR: IndexedDB/Dexie only with separate design/review.
- Keep all stores in-memory until approved Dexie hydration phase.
- Keep `verifyPin` adapter-injected; add bcrypt/cloud adapter only when persistence/auth integration phase requires it.
- Full payment extras beyond local fixture payment already on `main` still need separate design/review.

## Blocked

- Notion public/integration unavailable. Task 2.4 record only; no auth attempt.

## Risks

- All four stores remain in-memory only; no UI, DB, Dexie hydration, raw seed conversion, or inter-store coupling beyond what each task's scope allows.

## Done recently

- ReportsPanel range `aria-pressed` — merged #19 (`8d0df52`).
- MenuManagement filter `aria-pressed` — merged #18 (`f8b61bd`).
- MenuGrid searchbox name — merged #17 (`5e82122`).
- MenuGrid category `aria-pressed` — merged #16 (`d923167`).
- KitchenPanel filter `aria-pressed` — merged #15 (`1d34c2f`).
- KitchenPanel empty-state a11y — merged #14 (`3597b84`).
- OrderPanel empty-state a11y — merged #13 (`857554d`).
- MenuGrid search no-result a11y — merged #12 (`78bd65c`).
- MenuGrid empty-catalog a11y — merged #11 (`95c2838`).
- Issue #7 TableMap empty-state a11y — merged #10 (`97742bc`).
- Issue templates / triage labels / first contributor tasks — merged #9 (`848603f`).
- Issue #3 tablet/desktop visual evidence — `docs/ai-map/TASK_LOGS/2026-08-13-0417-issue-3-tablet-desktop-visual.md`
- Local payment + receipt + table release already on `main` (`382cec0`); Task 2.9 TODO above was stale.
- Task 2.5 PIN Login — `docs/ai-map/TASK_LOGS/2026-08-08-0832-task-2-5-pin-login.md` (implementation/gates verified; strict historical TDD evidence partially interrupted by Kiro rate limit and Luna tool stall).
- Task 2.4 shift and audit Zustand store — `docs/ai-map/TASK_LOGS/2026-08-08-0758-task-2-4-strict-tdd.md`
- Task 2.3 order and payment Zustand store — `docs/ai-map/TASK_LOGS/2026-08-02-0928-task-2.3.md`
- Task 2.2 catalog/table ownership and hostile input safety — `docs/ai-map/TASK_LOGS/2026-08-01-1115-task-2-2-ownership-input-safety.md`
- Task 2.2 catalog and table Zustand store — `docs/ai-map/TASK_LOGS/2026-08-01-1054-task-2-2-catalog-table-store.md`
- Task 2.1 tenant auth session boundaries — `docs/ai-map/TASK_LOGS/2026-08-01-1040-task-2-1-auth-boundaries.md`
- Task 2.1 tenant and auth Zustand store — `docs/ai-map/TASK_LOGS/2026-08-01-1020-task-2-1-tenant-auth-store.md`
