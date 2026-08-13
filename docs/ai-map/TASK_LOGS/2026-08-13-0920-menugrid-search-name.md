# Task: MenuGrid searchbox accessible name

Date: 2026-08-13 09:20 UTC
Repo: `/home/longnick/projects/small-pos-menugrid-search-name`
Branch: `fix/menugrid-search-name`
AI/Agent: Hermes / gcli/grok-4.6
User request: continue; Sol reviews after code

## Before state

- Existing branch: new from `origin/main` `d923167` (merged #16)
- Searchbox had `role="searchbox"` + placeholder only; accessible name empty
- Category `aria-pressed` already on main

## Goal

Đặt tên tiếng Việt cho searchbox MenuGrid. Placeholder/layout giữ nguyên. Không Dexie.

## Files changed

- `src/components/pos/MenuGrid.test.tsx` — named searchbox `Tìm món`
- `src/components/pos/MenuGrid.tsx` — `aria-label="Tìm món"`
- `docs/ai-map/*`

## Decisions made

- `aria-label="Tìm món"` (no ellipsis) so name is a spoken label, not placeholder punctuation.
- Placeholder stays `Tìm món...` for sighted users.

## Verification

- RED: searchbox name was empty (`placeholder` is not an accessible name).
- GREEN: MenuGrid 17/17 after `aria-label`.
- `npm run ci` — typecheck + 407/407 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy of this PR until asked.
- IndexedDB/Dexie later. Issue #1 docs feedback still open.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
