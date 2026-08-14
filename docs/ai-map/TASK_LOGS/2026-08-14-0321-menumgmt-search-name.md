# Task: MenuManagement search name

Date: 2026-08-14 03:21 UTC
Repo: `/home/longnick/projects/small-pos-menumgmt-search`
Branch: `fix/menumgmt-search-name`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue; next a11y sibling is MenuManagement search name

## Before state

- Existing branch: new from `origin/main` `734ebd4` (merged #24)
- MenuManagement search Input had only `placeholder="Tìm món..."` — Testing Library name empty, role textbox
- Dummy CRUD still no-ops

## Goal

Đặt tên `Tìm món` cho ô tìm MenuManagement. Cùng pattern MenuGrid #17. Placeholder giữ ellipsis. Không restyle. Không store. Không Dexie. Empty `Không có món nào` để slice sau.

## Files changed

- `src/components/pos/MenuManagement.test.tsx` — lock `getByRole("searchbox", { name: "Tìm món" })`
- `src/components/pos/MenuManagement.tsx` — `role="searchbox"` `type="search"` `aria-label="Tìm món"` + `aria-hidden` on Search icon
- `docs/ai-map/*`

## Decisions made

- Spoken name without ellipsis. Placeholder keeps `Tìm món...`.
- Empty-state left unnamed this slice (one behavior per PR).

## Verification

- RED: no searchbox named `Tìm món`; input reported as unnamed textbox.
- GREEN: MenuManagement 6/6 after attrs.
- `npm run ci` — typecheck + 424/424 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy of this PR until asked.
- MenuManagement empty `Không có món nào` still unnamed.
- IndexedDB/Dexie later. Issue #1 docs feedback still open.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
