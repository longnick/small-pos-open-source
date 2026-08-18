# Task: Sprint 2 send-to-kitchen vertical slice

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3` (`origin/main`, PR #38 merge CI green)
AI/Agent: Hermes / gcli/grok-4.6
User request: Sprint 2 canonical sell flow. First end-to-end vertical slice, no stubs.

## What shipped

- `sendToKitchen(sentAt)` on order store: open + items only; sets `status=sent`, `sentAt`, audit `order.sent`
- `recordPayment` accepts `open|sent`; keeps `sentAt` on paid order
- `selectOpenOrder` restores `sent` orders; `createOpenOrder` still open-only
- `persistAfterSend` writes sent order; restore reloads sent bind
- OrderPanel: Gửi bếp enabled for open+items; click sends + persists; pay stays enabled after send
- Isolated Playwright `npm run test:e2e:sell` at 390/768/1440: first-run → open table → add → reload → send kitchen → cash pay → receipt → release
- Screenshots untracked: `test-results/e2e-screenshots/sell-flow-*.png`

## RED / GREEN

- `sendToKitchen` missing → TypeError
- pay after send rejected (`false`)
- `persistAfterSend` missing → TypeError
- Gửi bếp still disabled in OrderPanel
- Then each test green with minimal store/persist/UI

## Not in this slice

- Persisted menu/table/staff CRUD
- Line/order cancel with reason UI
- Kitchen queue from `order.sent` (still hard-coded; Sprint 5)
- Shift/report truth (Sprint 3)

## Verification

Focused: send/persist/restore/OrderPanel/App. Then `npm run ci` and `npm run test:e2e:sell`.

## Next

Remaining Sprint 2: menu/table/staff CRUD + destructive reason/audit. No push/merge/deploy.
