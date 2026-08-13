# Task: MenuGrid empty-catalog accessible name

Date: 2026-08-13 05:49 UTC
Repo: `/home/longnick/projects/small-pos-menugrid-a11y`
Branch: `fix/menugrid-empty-a11y`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue; Sol reviews after code

## Before state

- Existing branch: new from `origin/main` `97742bc` (merged #10)
- Empty catalog text existed: `Chưa có món để hiển thị`
- Existing test only checked visible text, not accessible name
- Kitchen empty state is dummy static tickets; left alone

## Goal

Khóa tên empty-catalog tiếng Việt cho screen reader, cùng class với issue #7. Không restyle. Không Dexie.

## Files changed

- `src/components/pos/MenuGrid.test.tsx` — empty-catalog `getByRole("status", { name })`
- `src/components/pos/MenuGrid.tsx` — `role="status"` + `aria-label`
- `docs/ai-map/*`

## Decisions made

- Same pattern as TableMap: `role="status"` needs `aria-label` because accname is empty from text alone.
- Do not touch KitchenPanel (not fixture-backed).
- Do not name the search no-result state in this slice.

## Verification

- RED: Unable to find role status + name. DOM showed unnamed `<span>`.
- GREEN: MenuGrid 12/12 after attrs.
- `npm run ci` — typecheck + 395/395 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy.
- IndexedDB/Dexie later.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
