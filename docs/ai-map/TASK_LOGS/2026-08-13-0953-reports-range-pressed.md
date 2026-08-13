# Task: ReportsPanel range aria-pressed

Date: 2026-08-13 09:53 UTC
Repo: `/home/longnick/projects/small-pos-reports-pressed`
Branch: `fix/reports-range-pressed`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue after audit; next a11y sibling is ReportsPanel range chips

## Before state

- Existing branch: new from `origin/main` `f8b61bd` (merged #18)
- Range chips used visual class only; no `aria-pressed`
- Dummy stats, chart bars, and top-items list unchanged

## Goal

Khóa trạng thái pressed của range ReportsPanel cho screen reader. Cùng pattern Kitchen #15 / MenuGrid #16 / MenuManagement #18. Không restyle. Không store. Không Dexie.

## Files changed

- `src/components/pos/ReportsPanel.test.tsx` — default pressed, others unpressed, click exclusivity
- `src/components/pos/ReportsPanel.tsx` — `aria-pressed` + `type="button"` on range chips
- `docs/ai-map/*`

## Decisions made

- Same toggle-button pattern as Kitchen/MenuGrid/MenuManagement/PaymentModal.
- `type="button"` so chips never submit if later wrapped in a form.
- Dummy metrics left hardcoded this slice.

## Verification

- RED: `aria-pressed` was `null` on all range chips.
- GREEN: ReportsPanel 3/3 after attrs.
- `npm run ci` — typecheck + 413/413 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy of this PR until asked.
- IndexedDB/Dexie later. Issue #1 docs feedback still open.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
