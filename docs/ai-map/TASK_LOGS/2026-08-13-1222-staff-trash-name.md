# Task: StaffManagement trash name

Date: 2026-08-13 12:22 UTC
Repo: `/home/longnick/projects/small-pos-staff-trash`
Branch: `fix/staff-trash-name`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue; next a11y sibling is StaffManagement trash name

## Before state

- Existing branch: new from `origin/main` `829c166` (merged #22)
- StaffManagement trash buttons had empty accessible names
- Dummy CRUD still no-ops

## Goal

Đặt tên tiếng Việt cho nút icon trash trên hàng nhân viên. Cùng pattern MenuManagement #22 / OrderPanel. Không restyle. Không store. Không Dexie.

## Files changed

- `src/components/pos/StaffManagement.test.tsx` — lock `Xóa Nguyễn Minh Anh`
- `src/components/pos/StaffManagement.tsx` — `aria-label` + `type="button"` + `aria-hidden` on icon
- `docs/ai-map/*`

## Decisions made

- Names include staff name so each row is distinct to screen readers.
- One panel per PR; App shell nav left for later.

## Verification

- RED: no button named `Xóa Nguyễn Minh Anh`.
- GREEN: StaffManagement 4/4 after attrs.
- `npm run ci` — typecheck + 421/421 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy of this PR until asked.
- IndexedDB/Dexie later. Issue #1 docs feedback still open.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
