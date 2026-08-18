# ADR 0001 — Product bootstrap and first-run setup

Date: 2026-08-18
Status: Accepted for Sprint 1
Baseline: `main` `d11a4fd`

## Context

Production `App.tsx` still calls `bootstrapDemoAuth()`, which hashes public
`DEMO_STAFF` PINs (`0000`/`1111`/`2222`/`3333`) from `src/data/demo-seed.ts`
on every load. Empty clone therefore presents a demo tenant and demo PIN login.
There is no first-run path that creates a shop, tables, and a manager PIN
without editing source.

Dexie is v1 with nine stores. Nothing writes `appConfig`. Hydrate already
fail-closes on empty or hostile IDB.

## Decision

1. Product default reads local setup state from Dexie. Empty IDB is
   `needs-setup`. Valid `appConfig` + matching tenant + at least one manager
   with a stored `pinHash` is `ready`. Anything else is `corrupt`.
2. Add Dexie `version(2)` **additively**: create only the missing `appConfig`
   store. Preserve the nine v1 stores and their rows.
3. First-run wizard collects shop name, table count 1–10, manager name, and a
   4-digit PIN. Optional sample menu. No address/phone fields in v1 wizard;
   persist safe placeholders that already pass hydrate validation.
4. PIN is hashed with native Web Crypto PBKDF2-SHA-256, 100000 iterations,
   16-byte random salt, 256-bit key, versioned `v1$<salt_b64>$<key_b64>`.
   Raw PIN never persists, logs, or returns.
5. `completeFirstRun` writes tenant, manager staff, empty tables, optional
   sample catalog, and `appConfig` in one readwrite transaction. Create uses
   `add`. Duplicate or already-complete setup fails closed with no partial
   commit.
6. Product bootstrap (`loadProductBootstrap`) replaces `bootstrapDemoAuth()`
   as the App default. Demo adapter remains for existing unit tests and for
   E2E module aliases. Fixture E2E aliases the product bootstrap module, not
   production seed.
7. v1 backups (nine stores) still import. New exports are version 2 and
   include `appConfig`.
8. Corrupt setup shows a recovery surface that can import a backup. No
   auto-seed from `DEMO_STAFF` / `DEMO_TENANT`.

## Non-goals

Payment invariants, PWA, shift/report rewrite, kitchen RBAC, Firebase,
secrets, merge, deploy.

## Consequences

- Clean clone shows wizard, not Quán Demo / public PINs.
- Existing fixture Playwright suites must alias `@/pos/product-bootstrap`.
- PinLogin tenant label becomes a prop; it no longer hard-codes `Quán Demo`.
