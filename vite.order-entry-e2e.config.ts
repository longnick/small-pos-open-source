/**
 * Vite config for the order-entry E2E server only.
 *
 * Aliases:
 *   @/auth/demo-auth-adapter  → e2e/fixtures/test-auth-adapter.ts
 *   @/pos/demo-pos-bootstrap  → e2e/fixtures/test-order-entry-bootstrap.ts
 *
 * All other configuration (plugins, remaining aliases, etc.) is inherited from
 * the base vite.config.ts so the E2E build is otherwise identical to the
 * production build.
 *
 * ALIAS PRECEDENCE: the exact-module overrides must come FIRST in the array so
 * Vite's first-match resolver applies them before the broad "@" prefix alias.
 */
import { defineConfig, mergeConfig, loadConfigFromFile } from "vite";
import type { AliasOptions } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseConfig = await loadConfigFromFile(
  { command: "serve", mode: "development" },
  path.resolve(__dirname, "vite.config.ts"),
);

const baseAlias = baseConfig?.config?.resolve?.alias ?? {};

const baseAliasEntries: Array<{ find: string | RegExp; replacement: string }> =
  Array.isArray(baseAlias)
    ? (baseAlias as Array<{ find: string | RegExp; replacement: string }>)
    : Object.entries(baseAlias as Record<string, string>).map(
        ([find, replacement]) => ({ find, replacement }),
      );

const aliasWithOverridesFirst: AliasOptions = [
  // Exact-module substitutions — MUST come before the broad "@" entry.
  {
    find: "@/auth/demo-auth-adapter",
    replacement: path.resolve(
      __dirname,
      "e2e/fixtures/test-auth-adapter.ts",
    ),
  },
  {
    find: "@/pos/demo-pos-bootstrap",
    replacement: path.resolve(
      __dirname,
      "e2e/fixtures/test-order-entry-bootstrap.ts",
    ),
  },
  // All base aliases follow; "@" is here and handles every other @/… import.
  ...baseAliasEntries,
];

export default mergeConfig(
  baseConfig?.config ?? {},
  defineConfig({
    resolve: {
      alias: aliasWithOverridesFirst,
    },
    server: {
      port: 5276,
      strictPort: true,
      host: "127.0.0.1",
    },
  }),
);
