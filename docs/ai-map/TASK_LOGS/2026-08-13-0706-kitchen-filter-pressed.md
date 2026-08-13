# Task: KitchenPanel filter aria-pressed

Date: 2026-08-13 07:06 UTC
Repo: `/home/longnick/projects/small-pos-kitchen-filter`
Branch: `fix/kitchen-filter-pressed`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue; Sol reviews after code

## Before state

- Existing branch: new from `origin/main` `3597b84` (merged #14)
- Filter chips used visual class only; no `aria-pressed`
- Empty kitchen named status already on main

## Goal

Khóa trạng thái pressed của filter Kitchen cho screen reader. Cùng pattern PaymentModal. Không restyle. Không store. Không Dexie.

## Files changed

- `src/components/pos/KitchenPanel.test.tsx` — default pressed, others unpressed, click exclusivity
- `src/components/pos/KitchenPanel.tsx` — `aria-pressed={filter === item}` + `type="button"`
- `docs/ai-map/*`

## Decisions made

- Same toggle-button pattern as PaymentModal method chips.
- `type="button"` so chips never submit if later wrapped in a form.

## Verification

- RED: `aria-pressed` was `null` on all filter chips.
- GREEN: KitchenPanel 6/6 after attrs.
- `npm run ci` — typecheck + 403/403 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy of this PR until asked.
- IndexedDB/Dexie later. Issue #1 docs feedback still open.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
