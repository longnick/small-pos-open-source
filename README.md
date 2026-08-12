# Small POS

**Small POS** is an offline-first, Vietnamese-first point-of-sale starter for independent cafés and small restaurants. It is a public reference project for safe local order, payment, table, catalog, and staff workflows—not a production-ready payment system.

## Why it exists

Small venues need understandable workflows before they need enterprise infrastructure. This project explores a small, auditable POS core with:

- integer-VND calculations and safe input boundaries;
- local-first state and an intentionally staged persistence path;
- payment guards that reject unsafe or ambiguous transactions;
- responsive React UI for desktop, tablet, and mobile;
- executable unit, browser, typecheck, build, and leakage-scan gates.

## Current capabilities

- PIN-gated demo session with fixture-only E2E authentication.
- Local catalog, table, staff, shift, and audit foundations.
- Open-order item totals and discounts calculated in `packages/pos-core`.
- Local payment lifecycle:
  - cash tender with calculated change;
  - transfer/card/other require an exact amount;
  - immutable local receipt and audit entry;
  - underpayment, invalid tender, duplicate payment ID, and paid-order denial.
- Responsive POS shell with table, menu, order, kitchen, report, and staff views.

## Deliberate non-goals

This repository does **not** yet provide production payment processing, cloud sync, Firebase integration, electronic invoicing, refunds, real staff credentials, multi-device concurrency, or deployment instructions. Its demo PIN verifier is intentionally ephemeral and must not be used for real authentication.

See [ROADMAP.md](ROADMAP.md) for sequencing and [SECURITY.md](SECURITY.md) before testing or deploying anything derived from this code.

## Architecture

```text
packages/pos-core/     Pure domain types and integer-VND calculations
src/stores/            Local Zustand application state and trust-boundary guards
src/components/        React POS UI
src/auth/              Demo-only local authentication adapter
e2e/                   Fixture-authenticated Playwright smoke tests
scripts/               Leakage scanner and verification helpers
```

## Quick start

Requirements: Node.js 22 and npm.

```bash
git clone https://github.com/longnick/small-pos-open-source.git
cd small-pos-open-source
npm ci
npm run ci
npm run dev
```

Open the local URL printed by Vite. The app uses demo data only.

## Verification

```bash
npm test                 # unit and component tests
npm run typecheck        # TypeScript
npm run build            # production bundle
npm run scan:leakage     # source/brand/config leakage guard
npm run test:e2e         # Playwright fixture E2E
npm run ci               # typecheck + unit + build + leakage scan
```

The E2E suite uses a test-only auth adapter. It does not connect to a real backend or require production credentials.

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then choose an issue with the `good first issue` or `help wanted` label. Please keep changes small, test-backed, and within the roadmap boundary.

## Security and support

- Report vulnerabilities privately: [SECURITY.md](SECURITY.md)
- Ask usage questions or propose ideas: GitHub Discussions or Issues
- Community expectations: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## License

[MIT](LICENSE)

## Maintainer use of Codex

Codex is intended to assist with bounded maintenance work: reproducing issues, extending tests, reviewing local state transitions, documenting public APIs, and drafting small PRs. Every change still requires maintainer review and the repository verification gates.
