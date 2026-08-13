# Task: OrderPanel empty-state accessible name

Date: 2026-08-13 06:35 UTC
Repo: `/home/longnick/projects/small-pos-orderpanel-a11y`
Branch: `fix/orderpanel-empty-a11y`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue; Sol reviews after code

## Before state

- Existing branch: new from `origin/main` `78bd65c` (merged #12)
- Empty order text existed: `Chọn món để thêm vào đơn`
- Existing tests only checked visible text / testid / focus
- Always-mounted `role="status"` live region already used for qty/delete announcements

## Goal

Khóa tên empty-order tiếng Việt cho screen reader. Không restyle. Không phá live-region announcement. Không Dexie.

## Files changed

- `src/components/pos/OrderPanel.test.tsx` — empty-state `getByRole("region", { name })`
- `src/components/pos/OrderPanel.tsx` — `role="region"` + `aria-label` on empty-state
- `docs/ai-map/*`

## Decisions made

- First tried `role="status"` (same as #7/#11/#12). RED passed, GREEN collided with existing announcement live region (`getByRole("status")` found 2).
- Switched to `role="region"` + matching `aria-label`. Live-region stays the only unnamed `status`. Screen reader still finds the Vietnamese name.

## Verification

- RED: Unable to find role status + name. DOM showed unnamed empty-state + separate live `status`.
- GREEN after region: OrderPanel 38/38.
- `npm run ci` — typecheck + 397/397 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking. Non-blocking: aria-label repeats visible text.

## Remaining issues

- Sol review, PR, owner merge. No deploy.
- IndexedDB/Dexie later. Kitchen dummy empty still unnamed.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
