# Roadmap

Small POS is a reference starter. Roadmap items are not promises and should not be treated as production availability.

## Current: local workflow foundation

- [x] Tenant, staff, catalog, table, order, shift, and audit domain foundations.
- [x] Integer-VND order totals and discount calculation.
- [x] Local PIN-gated demo shell and fixture E2E adapter.
- [x] Local payment lifecycle with tender validation, change, receipt, audit, and duplicate protection.
- [x] Unit, typecheck, build, leakage, and fixture Playwright gates.

## Next: public demo and workflow coverage

- [x] Fixture-safe end-to-end open-order → payment → receipt → paid-order-deny flow.
- [x] Local table transition rules around payment completion.
- [x] Accessible receipt view and printable local-only receipt data.
- [x] More mobile/tablet visual regression evidence.
- [x] Issue templates, triage labels, and first contributor tasks.

## Later: persistence and concurrency

- [ ] IndexedDB/Dexie adapter with versioned local schema. Design: [`docs/dexie-design.md`](docs/dexie-design.md). Implementation is a later PR.
- [ ] Reload/replay, backup/restore, and corruption handling.
- [ ] Idempotency and concurrent-write boundaries across tabs.
- [ ] Migration and recovery documentation.

## Explicitly out of scope until separate design and review

- Production payment gateways or card processing.
- Real credentials, cloud authentication, or Firebase integration.
- Cloud sync and multi-device operational data.
- E-invoices, refunds, payroll, daily close, tax, and revenue reporting.
- Production deployment guidance.

## Where Codex helps

Codex can accelerate issue triage, test expansion, accessible UI work, code review, docs, and bounded persistence experiments. It must not bypass the safety boundaries above or merge unreviewed changes.
