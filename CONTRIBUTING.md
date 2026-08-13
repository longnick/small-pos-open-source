# Contributing

Thanks for improving Small POS.

## Before opening an issue

- Search existing Issues and Discussions first.
- Do not include real customer data, credentials, payment details, or internal business records.
- For vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
- Use a template: Bug report, Feature request, or Documentation.
- New issues get `needs-triage` until a maintainer classifies them.

## First contributor tasks

Start here if this is your first PR:

1. Filter Issues by `good first issue`.
2. If none fit, take a `help wanted` + `scope:docs` or `scope:a11y` task.
3. Keep the PR docs-only or one focused test/UI change.
4. Do not add persistence, cloud, payment gateways, or real credentials.

Current starter issues live on the repo Issues tab. If you are unsure whether a change is in scope, open a Discussion first.

## Labels

Templates apply a **type** label plus `needs-triage`. Maintainers add a `scope:*` label and remove `needs-triage`.

| Label | Kind | Meaning |
|---|---|---|
| `bug` / `enhancement` / `documentation` | type | Applied by the issue template. |
| `needs-triage` | queue | New. Maintainer has not classified it yet. |
| `good first issue` | intake | Small, fixture-safe, one-file-or-docs change. |
| `help wanted` | intake | Bounded and welcome; may need more context. |
| `scope:docs` | triage | Documentation only. |
| `scope:a11y` | triage | Accessibility / Vietnamese accessible names. |
| `scope:e2e` | triage | Fixture Playwright only. |
| `scope:ui` | triage | Local UI/copy/layout. No new product surface. |
| `out-of-scope` | triage | Rejected against ROADMAP / SECURITY boundaries. |

Do not replace type labels with `scope:*` in templates. `documentation` and `scope:docs` are both correct: type first, scope after triage.

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
