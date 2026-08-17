# Task: production-local mode gate

Date: 2026-08-17 09:20
Repo: `/tmp/small-pos-production-local` (clean worktree from `origin/main` `d11a4fd`)
Branch: `feat/production-local-mode`
AI/Agent: Hermes / gcli/grok-4.6
User request: `Duyệt làm tiếp theo gợi ý` — no open reviewed PR; start production-local / PWA increment.

## Before state

- Existing branch: none for this increment. Dirty local `/home/longnick/projects/small-pos` left untouched.
- Relevant source: `src/App.tsx` always called `bootstrapDemoAuth()`.
- Open reviewed PR: none.

## Goal

Tách runtime `demo` và `production-local`. Pages/default giữ demo. `VITE_POS_MODE=production-local` không seed staff/PIN demo.

## Files changed

- `src/runtime/pos-mode.ts` + test
- `src/components/auth/PinLogin.tsx` + venue-name test
- `src/App.tsx` + App test
- `src/vite-env.d.ts`
- ROADMAP + docs/ai-map

## Decisions made

Unknown env fail-closed to demo. production-local shows empty staff + `Chưa thiết lập quán`. No onboarding UI, PWA, Dexie staff write, merge, or deploy.

## Verification

Targeted Vitest then `npm run ci`.

## Remaining issues

No first-manager onboarding. No PWA. Pages still demo-only.

## Next step

Sol review, open PR, stop. Owner `Duyệt` merges.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched. Issue #1 not closed.
