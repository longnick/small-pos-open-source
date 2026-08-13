# Task: MenuManagement icon pencil/trash names

Date: 2026-08-13 11:43 UTC
Repo: `/home/longnick/projects/small-pos-icon-names`
Branch: `fix/menumgmt-icon-names`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue; next a11y sibling is icon-only pencil/trash names

## Before state

- Existing branch: new from `origin/main` `0af55aa` (merged #21)
- MenuManagement pencil/trash buttons had empty accessible names
- Dummy CRUD still no-ops

## Goal

Đặt tên tiếng Việt cho nút icon pencil/trash trên hàng món. Cùng pattern OrderPanel `Xóa {item}`. Không restyle. Không store. Không Dexie. Staff trash để slice sau.

## Files changed

- `src/components/pos/MenuManagement.test.tsx` — lock `Sửa Cà phê đen` / `Xóa Cà phê đen`
- `src/components/pos/MenuManagement.tsx` — `aria-label` + `type="button"` + `aria-hidden` on icons
- `docs/ai-map/*`

## Decisions made

- Names include item name so each row is distinct to screen readers.
- StaffManagement trash left unnamed this slice (one panel per PR).

## Verification

- RED: no button named `Sửa Cà phê đen` / `Xóa Cà phê đen`.
- GREEN: MenuManagement 5/5 after attrs.
- `npm run ci` — typecheck + 420/420 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy of this PR until asked.
- StaffManagement trash still unnamed.
- IndexedDB/Dexie later. Issue #1 docs feedback still open.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
