# Task: Dexie restore / reload design

Date: 2026-08-14 13:46 UTC
Repo: `/home/longnick/projects/small-pos-dexie-restore`
Branch: `docs/dexie-restore`
AI/Agent: Hermes / gcli/grok-4.6
User request: `Duyệt làm tiếp. Tự đặt tên` after #30 persist merged. No open reviewed PR. Named increment: Later #2 restore design.

## Before state

- Existing branch: new `docs/dexie-restore` from `origin/main` `50c0fae`
- Existing uncommitted files: none
- Relevant AI map files read: TODO, CHANGELOG, CODE_MAP, FILE_RELATIONS, DECISIONS
- Relevant source files read: `docs/dexie-design.md`, `docs/dexie-persist.md`, `src/App.tsx`, `src/pos/dexie-hydrate.ts`, `src/pos/dexie-persist.ts`, `src/stores/order-payment-store.ts`, `packages/pos-storage/src/backup.ts`

## Goal

Khóa thiết kế restore đơn mở khi chọn bàn occupied. Docs-only. Không viết adapter. Không tick Later #1/#2. Không đụng issue #1 / PR #31.

## Files changed

- `docs/dexie-restore.md` — design: click bàn occupied, không restore lúc boot
- `docs/dexie-design.md`, `docs/dexie-persist.md`, `ROADMAP.md`, `README.md` — trỏ design
- `docs/ai-map/*` — map + decision + task log

## Code relations

- Future `src/pos/dexie-restore.ts` reads `orders` (+ payments to classify paid-occupied)
- `src/App.tsx` `handleTableSelect` occupied branch calls it after persist-session flag
- `selectOpenOrder` stays the only Zustand write
- Hydrate / persist modules unchanged

## Decisions made

- Restore on occupied-table click, not boot
- Do not swap existing `currentOrder`
- Do not auto-repair paid-occupied
- Backup UI is a later increment, not first restore impl
- Same session flag as persist

## Verification

Docs only. No `src/` code. Sol after PR.

## Remaining issues

No restore adapter. Later #1 and Later #2 stay `[ ]`.

## Next step

Sol review. Open PR. Do not merge. Do not write restore code until owner names impl after this merges.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
No issue #1 / PR #31 edits.
