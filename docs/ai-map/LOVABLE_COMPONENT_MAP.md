# Lovable Component Map

Source project: `7086ccc2-fc0a-4031-a9b5-cf1f35932b3b` (`Cafe Companion POS`)

Audited ref: `1454998e49d347ca1f1c09aaba8fcaaaeefc0d24`  
Route surface: `/` only. Internal view state switches `pos`, `kitchen`, `menu`, `report`, `staff`.

## Architecture verdict

UI-only port into existing React + Vite app. Do not import TanStack Start, SSR, TanStack router, generated route tree, server middleware, or Lovable config. Keep Vite entry `src/main.tsx`; port route UI into `src/App.tsx` and local component paths below.

## Source disposition

### PORT

| Source path | Exact Vite target path | Disposition |
|---|---|---|
| `src/routes/index.tsx` | `src/App.tsx` | Port client UI and in-memory view state. Remove router-specific route exports. Source imports and renders `ReportsPanel`; preserve this dependency in target. |
| `src/styles.css` | `src/index.css` | Copy unchanged. Replace starter stylesheet; do not merge. |
| `src/hooks/use-mobile.tsx` | `src/hooks/use-mobile.tsx` | Port unchanged when responsive shell needs it. |
| `src/lib/pos.ts` | `src/lib/pos.ts` | Port types, maps, seed data, money/time helpers needed by first UI. |
| `src/lib/utils.ts` | `src/lib/utils.ts` | Port `cn` when copied components use it. |
| `src/components/pos/KitchenPanel.tsx` | `src/components/pos/KitchenPanel.tsx` | Port when `kitchen` view ships. |
| `src/components/pos/MenuManagement.tsx` | `src/components/pos/MenuManagement.tsx` | Port when `menu` view ships. |
| `src/components/pos/StaffManagement.tsx` | `src/components/pos/StaffManagement.tsx` | Port UI only; no persistence implied. |
| `src/components/pos/ReportsPanel.tsx` | `src/components/pos/ReportsPanel.tsx` | PORT Lovable UI structure/classes unchanged. Phase 2 replaces mock metrics/range source with typed domain adapter. |
| `src/components/ui/badge.tsx` | `src/components/ui/badge.tsx` | First-port direct cashier dependency. |
| `src/components/ui/button.tsx` | `src/components/ui/button.tsx` | First-port direct cashier dependency. |
| `src/components/ui/card.tsx` | `src/components/ui/card.tsx` | First-port direct cashier dependency. |
| `src/components/ui/input.tsx` | `src/components/ui/input.tsx` | First-port direct cashier dependency. |
| `src/components/ui/scroll-area.tsx` | `src/components/ui/scroll-area.tsx` | First-port direct cashier dependency. |
| `src/components/ui/separator.tsx` | `src/components/ui/separator.tsx` | First-port direct cashier dependency. |
| `src/components/ui/tabs.tsx` | `src/components/ui/tabs.tsx` | First-port direct cashier dependency. |
| `public/favicon.ico` | `public/favicon.ico` | Port only if source favicon replaces current one. |
| `public/robots.txt` | `public/robots.txt` | Port only if deployment needs source crawler policy. |

### EXCLUDE

| Source path | Why excluded |
|---|---|
| `src/routes/__root.tsx` | TanStack root document and provider infrastructure. |
| `src/routes/README.md` | Source route-folder notes. |
| `src/router.tsx` | TanStack router and scroll restore. |
| `src/routeTree.gen.ts` | Generated TanStack route registry. |
| `src/start.ts` | TanStack Start, CSRF, server-error middleware. |
| `src/server.ts` | SSR error normalization. |
| `src/lib/error-capture.ts` | Infrastructure not needed for UI-only port. |
| `src/lib/error-page.ts` | Infrastructure not needed for UI-only port. |
| `src/lib/lovable-error-reporting.ts` | Lovable-specific error-reporting glue. |
| Remote OG PNG in project metadata | Brand-specific remote URL. |
| All remaining `src/components/ui/*.tsx` primitives | Excluded until direct screen use proves need; list below. |
| Local photos, fonts, SVGs, video, uploaded media | No source paths found. |

## Root and config disposition

| Source path | Disposition |
|---|---|
| `components.json` | EXCLUDE. shadcn generator metadata; copied components need no generator config. |
| `AGENTS.md` | EXCLUDE. Source-agent instructions, not runtime. |
| `README.md` | EXCLUDE. Source-project documentation. |
| `.lovable/project.json` | EXCLUDE. Lovable project metadata. |
| `.prettierrc` | EXCLUDE. Existing repo tooling owns formatting. |
| `.prettierignore` | EXCLUDE. Existing repo tooling owns ignore policy. |
| `eslint.config.js` | EXCLUDE. Existing repo uses `oxlint`. |
| `bunfig.toml` | EXCLUDE. Existing repo uses npm/Vite scripts. |
| `bun.lock` | EXCLUDE. Existing repo uses `package-lock.json`. |
| `.gitignore` | EXCLUDE. Existing repo policy remains. |
| `tsconfig.json` | EXCLUDE. Existing React + Vite TypeScript config remains. |
| `package.json` | DEPENDENCY-SOURCE ONLY. Port exact UI dependency subset to target `package.json`; exclude TanStack Start/router/SSR dependencies. |
| `vite.config.ts` | EXCLUDE. Target owns Vite config; add Tailwind v4 `@tailwindcss/vite` integration and aliases only, with no TanStack plugin or config. |

## First-port UI dependency subset

Direct cashier imports: `Badge`, `Button`, `Card`, `Input`, `ScrollArea`, `Separator`, `Tabs`.

| Package | Needed by first port |
|---|---|
| `tailwindcss` | `src/index.css` Tailwind v4 stylesheet |
| `@tailwindcss/vite` | Tailwind v4 Vite integration |
| `tw-animate-css` | Imported by `src/index.css` |
| `lucide-react` | Cashier icons |
| `class-variance-authority` | `Badge`, `Button` variants |
| `clsx` | `cn` helper |
| `tailwind-merge` | `cn` helper |
| `@radix-ui/react-scroll-area` | `ScrollArea` |
| `@radix-ui/react-separator` | `Separator` |
| `@radix-ui/react-tabs` | `Tabs` |
| `@radix-ui/react-slot` | `Button` composition |

Every other primitive stays excluded: `accordion`, `alert-dialog`, `alert`, `aspect-ratio`, `avatar`, `breadcrumb`, `calendar`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `select`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `textarea`, `toggle-group`, `toggle`, `tooltip`.

Do not install their dependency packages until direct screen imports require them. `@tanstack/react-query`, `@tanstack/react-router`, `@tanstack/react-start`, `@tanstack/router-plugin`, `@lovable.dev/vite-tanstack-config`, `vite-tsconfig-paths`, and `nitro` remain excluded.

## Styling and responsive ownership

Tailwind v4 uses Vite integration: add `@tailwindcss/vite` to existing Vite config, then copy source `src/styles.css` unchanged to `src/index.css`, including Tailwind imports, `@source`, tokens, dark variant, and utility classes. Delete starter `src/App.css` and starter `src/index.css`; do not merge styles.

Component markup owns responsive behavior. Preserve source `sm:`, `lg:`, and `xl:` utility classes unchanged. Preserve `use-mobile` behavior: mobile means viewport width `<768px` via `(max-width: 767px)`. Keep cashier layout: tabs below `lg`, then `grid-cols-12` at `lg` with table/menu/order spans `3/5/4`; use three table columns at `xl`.

## Source facts retained for later ports

- `src/lib/pos.ts` has no API, DB, auth, persistence, or external data fetch in POS state.
- `ReportsPanel.tsx` uses CSS bars despite `recharts` being installed.
- No custom Tailwind `--breakpoint-*` values found.
