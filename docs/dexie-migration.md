# Dexie migration and recovery (Later #4)

Date: 2026-08-15
Repo: `longnick/small-pos-open-source`
Base: `main` `cc6c52e` (#33 restore) + this backup UI

This document is the recovery map for the live Dexie v1 adapter. It does **not** bump the schema. It does **not** add auto-repair writes.

`ROADMAP.md` Later #3 (multi-tab / idempotent concurrent writes) stays `[ ]`.

## Schema

Dexie **v1**. Database name `small-pos`. Nine stores:

`tenants`, `staff`, `catalogGroups`, `catalogItems`, `tables`, `orders`, `payments`, `shifts`, `auditLog`.

Orders are documents (`Order.items[]` on the row). Do not invent a line-item store.

There is no `version(2)`. A future schema bump needs its own design PR.

## Boot recovery

| Session | What happens |
|---|---|
| Production + empty IndexedDB | `hydrateFromDexie` returns `null`. Catalog/tables stay empty. Persist/restore/backup stay off. TableMap: `Chưa có bàn để hiển thị`. |
| Production + rejected IDB (bad tenant, hostile Proxy, open throw) | Same as empty. No partial hydrate. |
| Production + accepted hydrate | Catalog/tables load. Persist session on. Occupied-table click may restore one open order. Backup tab enabled. |
| E2E fixture (`bootstrapDemoPos()` non-null) | Hydrate skipped. Persist/restore/backup stay off. Fixture must not import into `small-pos`. |

Never auto-seed `DEMO_*` / `INITIAL_*` into IndexedDB. Never auto-import a backup on boot.

## Corruption classes

Live restore already classifies table↔order binds (`docs/dexie-restore.md`):

| Class | Recovery |
|---|---|
| `missing-order` | Leave table as-is. Do not create a replacement order. |
| `paid-occupied` | Leave table and payment as-is. Do not restore. Do not auto-release. |
| `status-mismatch` / `table-mismatch` / `tenant-mismatch` / `duplicate-open` / `invalid-record` | Return `null`. No Dexie write. Catalog/tables already hydrated stay. |

Backup import is fail-closed (`packages/pos-storage/src/backup.ts`):

- malformed JSON, wrong `version`, bad `exportedAt`, missing/unknown store, non-array store → throw, no write
- UI surfaces a generic `Không thể sao lưu`. Never show `pinHash`, raw PIN, or the rejected payload

## Operator recovery

1. **Export** (`Tải sao lưu`) after a hydrate-success session. File is version-1 JSON of all 9 stores. The UI must not render `pinHash` or a 4-digit PIN. The file still contains `staff.pinHash` — treat it as a local secret, do not share.
2. **Import** (`Nhập sao lưu`) is destructive. Confirm dialog first. Then clear 9 stores, `bulkPut`, `clearCurrentOrder`, re-hydrate catalog/tables.
3. Failed import (bad JSON / version / store list) leaves Zustand and Dexie unchanged.
4. Import that writes Dexie but cannot hydrate the signed-in tenant (`imported-unusable`) clears in-memory catalog/tables so UI does not keep stale rows. Dexie already holds the imported file.
5. Empty / rejected IDB: export and import stay disabled.

## What this is not

- Multi-tab `liveQuery` / BroadcastChannel — Later #3
- Auto-repair of `paid-occupied`
- Schema `version(2)`
- Cloud backup, Firebase, Capacitor
- Issue #1 / PR #31
