# Task: MenuGrid search no-result accessible name

Date: 2026-08-13 06:26 UTC
Repo: `/home/longnick/projects/small-pos-menugrid-noresult`
Branch: `fix/menugrid-no-result-a11y`
AI/Agent: Hermes / gcli/grok-4.6
User request: continue after merge #11; Sol reviews after code

## Before state

- Existing branch: new from `origin/main` `95c2838` (merged #11)
- Empty catalog already named (issue #11)
- Search no-result text existed: `Không tìm thấy món nào`
- Existing test only checked visible text, not accessible name

## Goal

Khóa tên search no-result tiếng Việt cho screen reader, cùng class với #7/#11. Không restyle. Không Dexie.

## Files changed

- `src/components/pos/MenuGrid.test.tsx` — no-result `getByRole("status", { name })`
- `src/components/pos/MenuGrid.tsx` — `role="status"` + `aria-label` on no-result div
- `docs/ai-map/*`

## Decisions made

- Same pattern as TableMap/empty catalog: `role="status"` needs `aria-label`.
- KitchenPanel still untouched (dummy tickets).

## Verification

- RED: Unable to find role status + name. DOM showed unnamed div with text.
- GREEN: MenuGrid 13/13 after attrs.
- `npm run ci` — typecheck + 396/396 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy.
- IndexedDB/Dexie later.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
