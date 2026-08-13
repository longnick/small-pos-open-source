# Task: MenuGrid category aria-pressed

Date: 2026-08-13 07:22 UTC
Repo: `/home/longnick/projects/small-pos-menugrid-pressed`
Branch: `fix/menugrid-category-pressed`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue; Sol reviews after code

## Before state

- Existing branch: new from `origin/main` `1d34c2f` (merged #15)
- Category pills used visual class only; no `aria-pressed`
- Empty/no-result named statuses already on main

## Goal

Khóa trạng thái pressed của category MenuGrid cho screen reader. Cùng pattern Kitchen #15 / PaymentModal. Không restyle. Không Dexie.

## Files changed

- `src/components/pos/MenuGrid.test.tsx` — default pressed, others unpressed, click exclusivity
- `src/components/pos/MenuGrid.tsx` — `aria-pressed={activeGroupId === group.id}`
- `docs/ai-map/*`

## Decisions made

- Same toggle-button pattern as Kitchen filter chips and PaymentModal methods.
- Exact name `"Cà phê"` / `"Trà"` / `"Đồ ăn"` — no collision with `+` item buttons.

## Verification

- RED: `aria-pressed` was `null` on category pills.
- GREEN: MenuGrid 16/16 after attr.
- `npm run ci` — typecheck + 406/406 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy of this PR until asked.
- IndexedDB/Dexie later. Issue #1 docs feedback still open.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
