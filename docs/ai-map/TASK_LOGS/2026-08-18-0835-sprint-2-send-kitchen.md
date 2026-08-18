# Task: Sprint 2 send-to-kitchen vertical slice + Sol P1/P2

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-99ef4e50`
Branch: `feat/sprint-2-canonical-sell-flow`
Baseline: `dc51bc3`
Follow-up HEAD after Sol BLOCKED `fa0f2d1`.
AI/Agent: Hermes / gcli/grok-4.6
User request: Fix only Sprint 2 slice 1 P1/P2. No push/merge/deploy.

## What shipped

- `sendToKitchen` / `recordPayment` require signed-in same-tenant staff + `can("order.send")` / `can("payment.record")`. Kitchen cannot pay. Staff cannot pay.
- UI hides/disables Gửi bếp and Thanh toán via the same `can()` checks.
- `recordPayment` rejects `createdAt < order.createdAt` or `< sentAt` with no mutation.
- `persistAfterSend` CAS: existing order must exist, same tenant/table/id; open row must match `expectedOpen`; same sent snapshot + audit id `send:{orderId}` is idempotent; different `sentAt` / paid row conflict. Writes order + `auditLog` in one Dexie transaction.
- `persistAfterPay` optionally writes `payment:{paymentId}` audit atomically. Same id is idempotent.
- Restore `loadRestoredOrderForTable` returns sent/open order plus durable order audits. App hydrates those audits on table select.
- UI awaits persist before success: send announces only after Dexie true; persist false reverts send and shows `role=alert` "Không lưu được gửi bếp. Đơn vẫn mở."
- Payment awaits `onPaymentSuccess` (now async persist). Persist/release false keeps modal, no receipt, `role=alert` "Không lưu được thanh toán. Kiểm tra lại đơn trước khi thu tiếp."
- E2E reloads after send, then login/select table: Gửi bếp disabled, Thanh toán enabled, pay/receipt overflow checked before close.

## Not claimed

- Kitchen queue UI still hard-coded (Sprint 5).
- Menu/table/staff CRUD still later Sprint 2.
- Memory payment still records before Dexie; persist false blocks receipt/release announcement and blocks a second pay because the order is already paid. Reload after a failed persist would restore the last durable (unpaid/sent) row.

## Verification

Focused store/persist/UI/App tests. Then `npm run ci` and `npm run test:e2e:sell` 390/768/1440.
