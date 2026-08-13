# Contributing

Thanks for improving Small POS.

## Before opening an issue

- Search existing Issues and Discussions first.
- Do not include real customer data, credentials, payment details, or internal business records.
- For vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Development setup

```bash
npm ci
npm run ci
npm run test:e2e
npm run test:e2e:visual
```

Use Node.js 22. The browser suite runs against a fixture-only authentication adapter; never replace it with real credentials or services.

## Pull requests

1. Create a focused branch from `main`.
2. Add or update a behavioral test before changing production code.
3. Keep each PR limited to one concern.
4. Run all relevant checks:

   ```bash
   npm run ci
   npm run test:e2e
   ```

5. Explain user-visible behavior, tests run, and remaining limitations in the PR body.

## Project boundaries

Do not add production payment processing, cloud credentials, Firebase configuration, e-invoicing, refunds, or real data integrations without an approved design and tests. Money amounts must remain safe integer VND at every input boundary. A failed write or validation must never be presented as payment success.

## Good contributions

- Reproducible bug reports with steps and expected/actual behavior.
- Unit tests for domain and state invariants.
- Fixture-safe Playwright coverage.
- Accessibility, Vietnamese copy, and responsive UI improvements.
- Documentation and roadmap work.

## Maintainer review

Maintainers review scope, tests, money/data safety, and public API impact before merge. Automated checks do not replace human review.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
