# Task: Issue templates, triage labels, first contributor tasks

Date: 2026-08-13 04:37 UTC
Repo: `/home/longnick/projects/small-pos-oss-triage`
Branch: `docs/issue-templates-triage`
AI/Agent: Hermes / gcli/grok-4.6
User request: continue after PR #5; Gemini Pro review after code

## Before state

- Existing branch: new from `origin/main` `382cec0`
- Existing uncommitted files: none
- Relevant files: `.github/ISSUE_TEMPLATE/*`, `CONTRIBUTING.md`, `ROADMAP.md`, open issues #1/#3
- PR #5 Gemini Pro review already APPROVE (`ag/gemini-pro-agent` → `gemini-pro-default`)

## Goal

Hoàn roadmap item: template + triage labels + first-task. Không đụng `src/`. Không stack lên PR #5.

## Files changed

- `.github/ISSUE_TEMPLATE/docs.yml` — Documentation template
- `.github/ISSUE_TEMPLATE/bug_report.yml` — add `needs-triage`
- `.github/ISSUE_TEMPLATE/feature_request.yml` — add `needs-triage`
- `CONTRIBUTING.md` — first-task path + label table
- `README.md` — contributing steps
- `ROADMAP.md` — check the item
- `docs/ai-map/*` — memory update

## Decisions made

- Reuse GitHub default labels (`bug`, `enhancement`, `documentation`, `good first issue`, `help wanted`).
- Add only missing taxonomy: `needs-triage`, `scope:docs`, `scope:a11y`, `scope:e2e`, `scope:ui`, `out-of-scope`.
- Docs-only PR. Labels/issues created via `gh` (repo metadata, not git).

## Verification

- Gemini Pro (`ag/gemini-pro-agent` → `gemini-pro-default`) first pass: REQUEST_CHANGES on docs.yml `documentation` vs `scope:docs`.
- Controller rejected the requested template swap: `documentation` is the type label (parallel to `bug`/`enhancement`); `scope:docs` is maintainer triage. CONTRIBUTING now states that split.
- `gh label list` has `needs-triage`, `scope:docs`, `scope:a11y`, `scope:e2e`, `scope:ui`, `out-of-scope`. Accidental `scope` label deleted.
- Starter issues: #6 (docs VI, covered by this README change), #7 (TableMap a11y, left open).

## Remaining issues

- Re-review after CONTRIBUTING clarification: APPROVE (`ag/gemini-pro-agent` → `gemini-pro-default`).
- `npm run ci` — typecheck + 393/393 + build + leakage PASS.
- PR #5 still unmerged (owner review).
- IndexedDB/Dexie still later.

## Safety notes

No secrets, database, migration, POS data, or raw media were touched.
