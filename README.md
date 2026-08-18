# Small POS · POS nhẹ cho quán nhỏ

[![CI](https://github.com/longnick/small-pos-open-source/actions/workflows/ci.yml/badge.svg)](https://github.com/longnick/small-pos-open-source/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/github/license/longnick/small-pos-open-source)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/longnick/small-pos-open-source?style=flat)](https://github.com/longnick/small-pos-open-source/stargazers)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)

> **Offline-first, Vietnamese-first POS starter for small cafés and restaurants.**
> Build clear local order, payment, table, and receipt workflows before adding costly cloud infrastructure.

<p align="center">
  <img src="docs/screenshots/payment-receipt-mobile.png" alt="Small POS mobile receipt after a cash payment" width="300" />
</p>

**Live demo:** https://longnick.github.io/small-pos-open-source/ *(fixture data only; never use for real payments)*

Small POS is a public MIT-licensed reference implementation—not production payment software. It is for independent F&B teams, food stalls, and developers who want a small, inspectable foundation instead of an enterprise POS.

[Tiếng Việt](#tiếng-việt) · [Features](#features) · [Quick start](#quick-start) · [Contributing](#contributing)

## Features

- **Local order and table workflow** — select an empty table, create a local open order, add menu items, and adjust or remove order lines.
- **Safe integer-VND totals** — subtotal and discount calculations live in a small domain core.
- **Local payment flow** — cash calculates change; transfer, card, and other methods require an exact amount.
- **Receipt before release** — payment receipt shows payment ID, method, total, tender, change, and timestamp; users can print it with the browser print dialog.
- **Table lifecycle guard** — a matching occupied/waiting-payment table is released only after verified payment; invalid state/order combinations fail closed.
- **Responsive UI** — exercised at mobile, tablet, and desktop viewports.
- **Executable quality gates** — unit/component tests, Playwright browser tests, typecheck, build, and source-leakage scan.

## Demo evidence

The screenshot above is produced by the fixture-only mobile payment E2E flow:

```text
select occupied table → cash tender → local receipt → close receipt → table released
```

It uses fake data and a build-time E2E auth fixture. It never uses customer records, a real gateway, or production credentials.

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS |
| Local state | Zustand |
| UI primitives | Radix UI, Lucide |
| Local persistence | Dexie / IndexedDB v1 — hydrate, persist, occupied-table restore, backup/restore UI, multi-tab CAS. [`docs/dexie-design.md`](docs/dexie-design.md) · [`docs/dexie-migration.md`](docs/dexie-migration.md) |
| Tests | Vitest, Testing Library, Playwright |
| Automation | GitHub Actions |

## Quick start

**Requirements:** Node.js 22 and npm.

```bash
git clone https://github.com/longnick/small-pos-open-source.git
cd small-pos-open-source
npm install
npm run setup
npm start
```

Open the exact local URL printed by Vite preview (`http://127.0.0.1:4173` by
default). Stop the server with `Ctrl+C`.

The first launch is a shop setup wizard: shop name, 1–10 tables, manager name,
and a 4-digit PIN used only on this device. Optional sample menu. There is no
public demo PIN. Data stays in this browser profile. `npm run dev` remains the
Vite development server. Backup files contain PIN hashes — do not share them.
Version-1 backups cannot restore a product shop.

The server runs only the browser frontend. It does not start a backend, database
server, cloud service, or payment gateway. Do not enter real payment credentials.

Run full local verification:

```bash
npm run ci
npx playwright install --with-deps chromium
npm run test:e2e
npm run test:e2e:payment
npm run test:e2e:order
npm run test:e2e:visual
npm run test:e2e:first-run
```

`npm run ci` covers type checking, unit/component tests, the production build,
and the source-leakage scan. `npm run verify:release` adds the fixture and
clean-profile Playwright suites, including first-run, recovery, and v1→v2
IndexedDB upgrade.

## Project boundaries

This repository deliberately does **not** include:

- production payment processing, VietQR/QR integration, or card handling;
- Firebase, cloud sync, live revenue/inventory reporting, or multi-device concurrency;
- electronic invoices, refunds, payroll, taxes, or production deployment guidance;
- real staff credentials or customer data.

The local PIN is hashed in the browser with Web Crypto. It is not production authentication. See [ROADMAP.md](ROADMAP.md) and [SECURITY.md](SECURITY.md) before extending this project.

## Architecture

```text
packages/pos-core/     Pure domain types and integer-VND calculations
src/stores/            Local Zustand state and trust-boundary guards
src/components/        React POS UI
src/auth/              Legacy demo adapter (tests/fixtures only)
e2e/                   Fixture-authenticated Playwright tests
scripts/               Leakage scanner and verification helpers
```

## Contributing

Issues, docs improvements, accessibility work, test coverage, and small workflow fixes are welcome.

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) for templates, labels, and first-task rules.
2. Search existing Issues and Discussions.
3. Open a Bug, Feature, or Documentation template. New issues start as `needs-triage`.
4. Choose a focused `good first issue` or `help wanted` task.
5. Keep changes test-backed; run `npm run ci` and relevant E2E tests.

Please do not include credentials, customer data, payment data, or real business configuration in issues or pull requests.

## Security, community, and license

- Security reports: [SECURITY.md](SECURITY.md)
- Community expectations: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- License: [MIT](LICENSE)
- Ideas and usage questions: [GitHub Discussions](https://github.com/longnick/small-pos-open-source/discussions)

## Tiếng Việt

**Small POS** là mã nguồn mở cho quán ăn, quán cà phê, xe đồ ăn và mô hình F&B nhỏ. Mục tiêu: có luồng bán hàng cục bộ, dễ đọc và dễ kiểm thử trước khi thêm hạ tầng cloud tốn chi phí.

Hiện có: chọn bàn, đơn hàng, tính tiền VND an toàn, tiền thừa tiền mặt, thanh toán đúng số với chuyển khoản/thẻ, hóa đơn local có thể in, và trả bàn sau thanh toán hợp lệ.

Chưa có: VietQR, Firebase, cloud sync, tồn kho/doanh thu thời gian thực, cổng thanh toán, hoàn tiền, hóa đơn điện tử, hay hướng dẫn deploy production. Đây là các giới hạn có chủ đích để giữ core nhỏ và an toàn.

Nếu dự án hữu ích, hãy mở Issue/Discussion hoặc cho repo một Star để giúp nhiều người tìm thấy nó hơn.

Muốn đóng góp lần đầu:

1. Đọc [CONTRIBUTING.md](CONTRIBUTING.md) để biết template, nhãn, và việc nhỏ cho người mới.
2. Mở Issue bằng mẫu Bug / Feature / Documentation. Issue mới có nhãn `needs-triage`.
3. Chọn việc `good first issue` hoặc `help wanted`.
4. Không gửi mật khẩu, dữ liệu khách, hay thông tin thanh toán thật.

## Maintainer use of Codex

Codex may help reproduce issues, extend tests, review local state transitions, document public APIs, and draft bounded PRs. Maintainer review and repository verification gates remain required before merge.
