# Dexie multi-tab concurrent writes (Later #3)

Date: 2026-08-15
Repo: `longnick/small-pos-open-source`
Base: `main` `21c2bde` (#34 backup UI)

This document is the live contract for Later #3. Schema stays Dexie **v1**. No `liveQuery`. No Zustand persist middleware.

## Goal

Two browser tabs of the same tenant must not silently overwrite each other's occupy / edit / pay rows, and a quiet tab must refresh catalog/tables after the other tab writes.

## Gate

Same persist session as Later #1: only after this tab accepted `hydrateFromDexie`. Empty IDB / E2E fixture stay off.

## Compare-and-swap (writer)

Inside the existing persist transaction:

| Writer | Refuse and leave IDB unchanged when |
|---|---|
| `persistAfterOccupy` | Dexie table exists, is not `empty`, and `currentOrderId` is a **different** order |
| `persistAfterOrderEdit` | Dexie order exists and `status !== "open"` |
| `persistAfterPay` | Dexie table is not `empty` and `currentOrderId` is a **different** order, or a payment id already belongs to another order |

Pay **snapshot** still follows Later #1: only `empty` or `occupied` + same `currentOrderId`. A `waiting_payment` snapshot is rejected at that gate, unchanged. CAS does not widen the snapshot.

Same-id occupy / same-id pay replay is allowed (idempotent). Zustand is not rolled back when Dexie refuses — memory already accepted the click. Operator recovers via backup / reload.

## Cross-tab notify

After a successful persist write, post `{ tenantId, kind }` on `BroadcastChannel("small-pos-dexie")`.

A listening tab with the same tenant and persist session on:

1. ignores other tenants and malformed payloads
2. re-runs `hydrateFromDexie`
3. `replaceTenantData` catalog/tables only
4. does **not** swap `currentOrder`

Missing `BroadcastChannel` is a silent no-op.

## What this is not

- Shared `currentOrder` across tabs
- Auto-repair `paid-occupied`
- Schema `version(2)`
- Cloud sync / multi-device
- Issue #1 / PR #31
