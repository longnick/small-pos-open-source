# Task 2.5 — Sol guide: PIN Login

Source review: `cx/gpt-5.6-sol` via 9Router, 2026-08-08.

## Scope

Add bounded PIN login UI over existing `useTenantAuthStore`. Keep all state in memory. No Dexie, storage, routing, event bus, other-store coupling, dependency or seed changes.

- Add `src/auth/demo-auth-adapter.ts` and tests.
- Add `src/components/auth/PinLogin.tsx`; component tests only if existing test stack supports them.
- Change `src/App.tsx` only to wrap existing shell in auth/bootstrap gate. Keep existing shell JSX/classes unchanged.
- Do not change `src/data/demo-seed.ts`, tenant/auth store, core auth/types, package or lockfile.

No supplied Lovable login artifact exists in repo. Build a small login component with existing project primitives/tokens only; do not modify unrelated Lovable shell styling. Capture 390px screenshot for owner review.

## Demo adapter

- Map demo tenant/staff into core `Tenant`/`Staff`; provide defaultTax/defaultSurcharge/createdAt as zero.
- Hash each demo PIN with ephemeral native Web Crypto PBKDF2 SHA-256: fresh 16-byte salt, 100000 iterations, 256-bit key, versioned internal format.
- Return only `{ tenant, staff, verifier }`. No returned staff `pin`; no logging, storage, URL exposure, window globals, seed object reuse, or raw-PIN closure after bootstrap.
- Verifier fails closed for malformed pin/hash/version/base64/length/Web Crypto errors and uses full-length byte comparison.
- `ponytail:` comment: ephemeral demo verifier only; replace with approved bcrypt/cloud adapter at persistence/auth integration.

## UI and shell gate

- Select staff, then exactly four masked digits. No raw demo PIN/hashes rendered.
- Native form; `type=password`, `inputMode=numeric`, `autoComplete=off`, max 4 digits, filter non-digits.
- Disable until staff + valid PIN; busy disables controls; duplicate submit blocked.
- Clear PIN after every completed attempt; preserve selection; generic error only: `PIN không đúng. Vui lòng thử lại.`; focus PIN on failure.
- Bootstrap loading/fatal states show no POS shell. Fatal copy: `Không thể khởi tạo đăng nhập.`
- Render POS shell only when bootstrap ready, tenant/staff non-null, and `staff.tenantId === tenant.id`. Shell must not be hidden behind overlay; it must be absent from DOM.
- Refresh returns to login. No logout UI required.

## Accessibility / visual

Visible login heading, tenant context, accessible staff selection, persistent PIN label, alert/live error, aria-invalid/describedby, aria-busy, keyboard/Enter submit, 44px touch targets, no color-only selection/error.

390×844 acceptance: no shell prior auth, no horizontal overflow, controls fit, error/busy do not clip, no PIN/hash visible. Also desktop 1440×900 smoke.

## Strict TDD

Vertical RED→GREEN slices, log exact output/exit per slice:
1. adapter maps core tenant/staff with no `pin` on output;
2. verifier accepts correct PIN only and rejects malformed/tampered hashes;
3. App gate renders loading/error/login but no shell until successful sign-in;
4. staff selection/PIN validation and native form behavior;
5. generic failure/no-leak/busy behavior;
6. success/sign-out/remount session boundary.

If component test dependencies are absent, do not add them. Record UI test gap; use existing browser Playwright/manual proof instead.

## Gates

Focused adapter/store/UI tests; full unit; typecheck; build; leakage/self-test; oxlint; Playwright 390px/desktop screenshot; `git diff --check`. Update AI map + task log. No commit/push/deploy until independent review passes.
