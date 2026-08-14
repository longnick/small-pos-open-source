# AI TODO

## Doing

- Dexie design PR — docs only. Later #1 still `[ ]`. No adapter.

## Next

- After owner merge: read-only Dexie hydrate PR (`docs/dexie-design.md`). Not this PR.
- Keep all stores in-memory until that hydrate PR.
- Keep `verifyPin` adapter-injected; bcrypt/cloud only in a later auth-persist slice.
- Later #2–#4 (reload/backup, multi-tab, migration docs) stay separate.
- Issue #1 stays for a contributor.

## Blocked

- Notion public/integration unavailable. Task 2.4 record only; no auth attempt. (Stale note: key now in Hermes env; 56-task page synced 2026-08-14. Do not write Notion on this PR unless owner asks.)

## Risks

- All four stores remain in-memory only. Dexie v1 schema exists unused. Design forbids auto-seed and write-back in the first adapter PR.

## Done recently

- Dexie design (Later #1, docs only) — `docs/ai-map/TASK_LOGS/2026-08-14-0530-dexie-design.md`
- MenuManagement empty status — merged #26 (`94bb10f`).
- App shell nav `aria-current` — merged #24 (`734ebd4`).
- StaffManagement trash name — merged #23 (`885542b`).
- MenuManagement icon pencil/trash names — merged #22 (`829c166`).
- PaymentModal `type="button"` — merged #21 (`0af55aa`).
- StaffManagement shift `aria-pressed` — merged #20 (`79f5716`).
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
