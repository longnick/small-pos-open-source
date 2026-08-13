# Task: Issue #7 TableMap empty-state accessible name

Date: 2026-08-13 05:41 UTC
Repo: `/home/longnick/projects/small-pos-issue7`
Branch: `fix/issue-7-tablemap-empty-a11y`
AI/Agent: Hermes / gcli/grok-4.6
User request: continue after merge/Pages; review with `cx/gpt-5.6-sol`

## Before state

- Existing branch: new from `origin/main` `848603f`
- Empty state text existed: `Chưa có bàn để hiển thị`
- No `role="status"` / accessible name; TableMap tests had no empty-state case
- Sol smoke: `cx/gpt-5.6-sol` → returned `gpt-5.6-sol`, literal `SOL-SMOKE-OK`

## Goal

Khóa tên empty-state tiếng Việt cho screen reader. Không restyle. Không mở rộng TableMap.

## Files changed

- `src/components/pos/TableMap.test.tsx` — empty-state `getByRole("status", { name })`
- `src/components/pos/TableMap.tsx` — `role="status"` + `aria-label` (status name is empty from text alone)
- `docs/ai-map/*`

## Decisions made

- Keep visible copy unchanged.
- `role="status"` alone has no accessible name in Testing Library / accname; add matching `aria-label`.

## Verification

- RED: Unable to find role status + name. DOM showed unnamed `<p>`.
- After `role="status"` only: status exists, name still `""`.
- GREEN: 5/5 TableMap after `aria-label`.
- `npm run ci` — typecheck + 394/394 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy.
- IndexedDB/Dexie later.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
