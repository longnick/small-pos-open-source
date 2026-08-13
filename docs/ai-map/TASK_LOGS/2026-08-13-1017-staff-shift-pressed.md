# Task: StaffManagement shift aria-pressed

Date: 2026-08-13 10:17 UTC
Repo: `/home/longnick/projects/small-pos-staff-pressed`
Branch: `fix/staff-shift-pressed`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue; next a11y sibling is StaffManagement shift chips

## Before state

- Existing branch: new from `origin/main` `8d0df52` (merged #19)
- Shift chips used visual class only; no `aria-pressed`
- Dummy staff list, stats, and icon buttons unchanged

## Goal

Khóa trạng thái pressed của filter ca StaffManagement cho screen reader. Cùng pattern Reports #19 / MenuManagement #18. Không restyle. Không store. Không Dexie.

## Files changed

- `src/components/pos/StaffManagement.test.tsx` — default pressed, others unpressed, click exclusivity
- `src/components/pos/StaffManagement.tsx` — `aria-pressed` + `type="button"` on shift chips
- `docs/ai-map/*`

## Decisions made

- Same toggle-button pattern as Kitchen/MenuGrid/MenuManagement/Reports/PaymentModal.
- `type="button"` so chips never submit if later wrapped in a form.
- Icon trash / "Thêm nhân viên" left unnamed this slice.

## Verification

- RED: `aria-pressed` was `null` on all shift chips.
- GREEN: StaffManagement 3/3 after attrs.
- `npm run ci` — typecheck + 416/416 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy of this PR until asked.
- IndexedDB/Dexie later. Issue #1 docs feedback still open.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
