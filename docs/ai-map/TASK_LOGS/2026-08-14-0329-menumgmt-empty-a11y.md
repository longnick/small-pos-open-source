# Task: MenuManagement empty status

Date: 2026-08-14 03:29 UTC
Repo: `/home/longnick/projects/small-pos-menumgmt-empty`
Branch: `fix/menumgmt-empty-a11y`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue; next a11y sibling is MenuManagement empty `Không có món nào`

## Before state

- Existing branch: new from `origin/main` `95ad81a` (merged #25)
- Empty copy existed; no `role="status"` / `aria-label`
- No live-region status in this component

## Goal

Đặt tên empty `Không có món nào` cho screen reader. Cùng pattern #10–#14. Không restyle. Không store. Không Dexie.

## Files changed

- `src/components/pos/MenuManagement.test.tsx` — lock copy + `getByRole("status", { name: "Không có món nào" })` after unmatched search
- `src/components/pos/MenuManagement.tsx` — `role="status"` + `aria-label="Không có món nào"`
- `docs/ai-map/*`

## Decisions made

- Used `role="status"` because MenuManagement has no existing live-region.
- Triggered empty via unmatched search `xyz-no-match` instead of rewriting fixture data.

## Verification

- RED: copy present, no status named `Không có món nào`.
- GREEN: MenuManagement 7/7 after attrs.
- `npm run ci` — typecheck + 425/425 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy of this PR until asked.
- After this, leftover presentation a11y siblings are exhausted. Next product work is IndexedDB/Dexie (needs separate design/review) or issue #1 (leave for contributor).

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
