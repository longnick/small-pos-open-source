# Task: Dexie backup UI + Later #4 recovery docs

Date: 2026-08-15
Repo: `/home/longnick/projects/small-pos-dexie-backup-ui`
Branch: `feat/dexie-backup-ui`
AI/Agent: Hermes / gcli/grok-4.6
User request: `Làm tiếp đến 90% rồi báo lại cho tôi` after #33 restore merged.

## Before state

- Existing branch: new worktree from `origin/main` `cc6c52e`
- Existing uncommitted files: none
- Relevant source: `docs/dexie-restore.md` backup UI bounds, `packages/pos-storage/src/backup.ts`, `src/App.tsx`

## Goal

Close Later #2 leftover (backup/import UI + fail-closed corruption) and Later #4 recovery docs. Tick ROADMAP Later #1/#2/#4 so official count is **13/14 ≈ 93%**. Leave Later #3 (multi-tab) `[ ]`.

## Files changed

- `src/pos/dexie-backup.ts` + `src/pos/dexie-backup.test.ts` — session-gated export/import + rehydrate
- `src/components/pos/BackupPanel.tsx` + test — named export/import, confirm, no `pinHash` on screen
- `src/App.tsx` / `src/App.test.tsx` — Sao lưu nav, enable only after hydrate-success
- `docs/dexie-migration.md` — Later #4
- `ROADMAP.md` — tick #1/#2/#4
- docs/ai-map

## Decisions

- Reuse existing `exportBackup` / `importBackup`. No schema bump.
- Import confirm required. Fail-closed generic status. Never render `pinHash` / raw PIN.
- Empty IDB / E2E fixture: backup disabled.
- Do not start Later #3. Do not touch issue #1 / PR #31.

## Verification

- RED: missing `./dexie-backup` then missing `./BackupPanel`
- GREEN: backup adapter 5 + panel 6 + App wiring
- Full `npm run ci` pending

## Remaining

- Sol `cx/gpt-5.6-sol`. Open PR. Do not merge here.
- Later #3 stays `[ ]`. Official after this merge: 13/14.

## Safety

No secrets, live POS data, or issue #1 / PR #31 touched.
