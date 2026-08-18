# Task: Sprint 1 product bootstrap

Date: 2026-08-18
Repo: `/home/longnick/projects/small-pos-open-source/.worktrees/hermes-fe974674`
Branch: `feat/sprint-1-product-bootstrap`
Baseline: `d11a4fd`
AI/Agent: Hermes / gcli/grok-4.6
User request: Sprint 1 first-run wizard, Dexie appConfig, product bootstrap, setup/start, clean-profile E2E.

## What shipped

- ADR `docs/adr/0001-product-bootstrap.md`
- Dexie `version(2)` additive `appConfig`
- First-run: shop name, 1–10 tables, manager + salted PIN, optional sample menu
- Product bootstrap replaces demo default. Empty = wizard. Corrupt = recovery import
- Backup export v2 includes `appConfig`; v1 backups still import
- `npm run setup` / `npm start`
- Isolated Playwright first-run 390/768 + reload

## RED / GREEN

- Schema v2: expected verno 1, then 2
- First-run persist / reject / repeat / menu / PIN / missing appConfig
- Bootstrap empty/ready/corrupt
- Wizard submit
- Backup v2 export + v1 import
- App empty clone shows wizard, not Quán Demo / 0000

## Verification

Focused unit/component suite for new files + App/order-entry/backup. Then `npm run ci` and `npm run test:e2e:first-run`.

## Next

Sol `cx/gpt-5.6-sol`. No merge/push/deploy.
