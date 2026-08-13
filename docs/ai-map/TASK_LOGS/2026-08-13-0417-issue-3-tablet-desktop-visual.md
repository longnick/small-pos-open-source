# Task: Issue #3 tablet/desktop visual evidence

Date: 2026-08-13 04:17 UTC
Repo: `/home/longnick/projects/small-pos-issue3`
Branch: `test/issue-3-tablet-desktop-visual`
AI/Agent: Hermes / gcli/grok-4.6 via 9router
User request: Continue Small POS from GitHub `origin/main`; implement next roadmap item (issue #3).

## Before state

- Existing branch: clean worktree from `origin/main` @ `382cec0`
- Existing uncommitted files: none
- Relevant AI map files read: `TODO_AI.md`, `CODE_MAP.md`, `FILE_RELATIONS.md`, `CHANGELOG_AI.md`
- Relevant source files read: `e2e/order-entry.spec.ts`, `playwright.order-entry.config.ts`, `playwright.config.ts`, `src/App.tsx`, issue #3 body

## Goal

Thêm bằng chứng visual ổn định cho luồng mở bàn / thêm món / chỉnh dòng đơn tại 768×1024 và 1440×900, fixture tách khỏi smoke, chạy trên GitHub Actions. Không đụng persistence/cloud/payment thật.

## Files changed

- `e2e/visual-tablet-desktop.spec.ts` — isolated tablet/desktop visual + workflow tests
- `playwright.visual.config.ts` — dedicated Playwright config on port 5277
- `playwright.config.ts` — ignore visual spec in default smoke
- `package.json` — `test:e2e:visual`
- `.github/workflows/ci.yml` — run visual suite
- `README.md`, `CONTRIBUTING.md` — document the new command
- `docs/ai-map/*` — memory + screenshots
- `ROADMAP.md` — mark visual-evidence item done

## Code relations

- Reuses `vite.order-entry-e2e.config.ts` + `e2e/fixtures/test-order-entry-bootstrap.ts`
- Does not change `src/` production UI
- Default `npm run test:e2e` still ignores this spec

## Decisions made

- Tablet (768) keeps mobile tabs (`lg` = 1024). Desktop shows 3-column layout.
- Assert only currently visible controls. Do not measure hidden table cards after switching to Đơn tab.
- Screenshots live under `docs/ai-map/TASK_LOGS/issue-3-*.png` so historical Task 2.x baselines stay untouched.

## Verification

- `npm run test:e2e:visual` — 4 passed (tablet + desktop × 2 flows)
- Isolation: default `npm run test:e2e` ignores `visual-tablet-desktop.spec.ts`
- `npm run ci` — typecheck + 393/393 unit + build + leakage PASS
- `npm run test:e2e` — 22 passed / 32 skipped
- `npm run test:e2e:payment` — 1 passed
- `npm run test:e2e:order` — 3 passed
- Historical Task 2.x PNG baselines restored after smoke rerun; not committed.

## Remaining issues

- GitHub Actions CI on the PR is the remaining remote gate.
- Pixel inspection of screenshots is not claimed as visual approval.

## Next step

Open PR for issue #3 after local gates pass. Do not merge without owner review.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
