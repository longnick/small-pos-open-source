# Task: MenuManagement filter aria-pressed

Date: 2026-08-13 09:30 UTC
Repo: `/home/longnick/projects/small-pos-menumgmt-filter`
Branch: `fix/menumgmt-filter-pressed`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue; also count remaining roadmap tasks

## Before state

- Existing branch: new from `origin/main` `5e82122` (merged #17)
- Filter chips used visual class only; no `aria-pressed`
- Dummy catalog list and icon buttons unchanged

## Goal

Khóa trạng thái pressed của filter MenuManagement cho screen reader. Cùng pattern Kitchen #15 / MenuGrid #16. Không restyle. Không store. Không Dexie.

## Files changed

- `src/components/pos/MenuManagement.test.tsx` — default pressed, others unpressed, click exclusivity
- `src/components/pos/MenuManagement.tsx` — `aria-pressed` + `type="button"` on filter chips
- `docs/ai-map/*`

## Decisions made

- Same toggle-button pattern as Kitchen/MenuGrid/PaymentModal.
- `type="button"` so chips never submit if later wrapped in a form.
- Icon pencil/trash buttons left unnamed this slice.

## Verification

- RED: `aria-pressed` was `null` on all filter chips.
- GREEN: MenuManagement 3/3 after attrs.
- `npm run ci` — typecheck + 410/410 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking. Non-blocking: tests do not lock `type="button"`.

## Remaining issues

- Sol review, PR, owner merge. No deploy of this PR until asked.
- IndexedDB/Dexie later. Issue #1 docs feedback still open.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
