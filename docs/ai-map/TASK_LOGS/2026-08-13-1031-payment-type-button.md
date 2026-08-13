# Task: PaymentModal type=button

Date: 2026-08-13 10:31 UTC
Repo: `/home/longnick/projects/small-pos-payment-type`
Branch: `fix/payment-type-button`
AI/Agent: Hermes / gcli/grok-4.6
User request: approve and continue; next a11y sibling is PaymentModal type=button

## Before state

- Existing branch: new from `origin/main` `79f5716` (merged #20)
- PaymentModal buttons had no explicit type (HTML default submit)
- Payment logic, tender, receipt flow unchanged

## Goal

Khóa `type="button"` trên mọi nút PaymentModal để không submit form nếu sau này bọc form. Không đổi logic thanh toán. Không Dexie.

## Files changed

- `src/components/pos/PaymentModal.test.tsx` — lock type=button on method/Hủy/confirm + receipt In/Đóng
- `src/components/pos/PaymentModal.tsx` — add type="button" to all five button sites
- `docs/ai-map/*`

## Decisions made

- Same type=button hygiene as Kitchen/MenuGrid/MenuManagement/Reports/Staff chips.
- Icon-only buttons in other panels left unnamed this slice.

## Verification

- RED: type attribute was `null` on method/Hủy/confirm and receipt buttons.
- GREEN: type=button tests 2/2 after attrs.
- `npm run ci` — typecheck + 418/418 + build + leakage PASS.
- Sol review: `cx/gpt-5.6-sol` → `gpt-5.6-sol`, verdict APPROVE. No blocking.

## Remaining issues

- Sol review, PR, owner merge. No deploy of this PR until asked.
- IndexedDB/Dexie later. Issue #1 docs feedback still open.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
