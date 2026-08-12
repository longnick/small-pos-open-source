/**
 * Vite config for Playwright E2E server only.
 *
 * Adds a single exact-module alias that redirects the production import
 *   import { bootstrapDemoAuth } from "@/auth/demo-auth-adapter"
 * to the E2E fixture, giving the test browser fake staff without touching
 * any source under src/ or the normal vite.config.ts.
 *
 * All other configuration (plugins, remaining aliases, etc.) is inherited
 * from the base config so the E2E build is otherwise identical to production.
 *
 * ALIAS PRECEDENCE FIX: mergeConfig with object-form aliases produces a plain
 * object whose keys are iterated in insertion order. Because the base config
 * has "@" before "@/auth/demo-auth-adapter", the broad "@" prefix wins and the
 * exact substitution is never reached. Fix: build the final alias as an ARRAY
 * with the exact override entry first, then base aliases appended. Vite's alias
 * resolver takes the first match, so the exact entry wins before "@" is tested.
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

// ---------------------------------------------------------------------------
// Build alias array: exact override FIRST, then all base aliases.
// Array-form guarantees that the first matching entry wins; the broad "@"
// prefix alias cannot shadow the exact "@/auth/demo-auth-adapter" entry.
// ---------------------------------------------------------------------------
const baseAlias = baseConfig?.config?.resolve?.alias ?? {};

// Normalise base aliases to [{find, replacement}] regardless of whether the
// base config used an object or an array.
const baseAliasEntries: Array<{ find: string | RegExp; replacement: string }> =
  Array.isArray(baseAlias)
    ? (baseAlias as Array<{ find: string | RegExp; replacement: string }>)
    : Object.entries(baseAlias as Record<string, string>).map(
        ([find, replacement]) => ({ find, replacement }),
      );

const aliasWithOverrideFirst: AliasOptions = [
  // Exact-module substitution — MUST come before the broad "@" entry.
  {
    find: "@/auth/demo-auth-adapter",
    replacement: path.resolve(__dirname, "e2e/fixtures/test-auth-adapter.ts"),
  },
  // All base aliases follow; "@" is here and handles every other @/… import.
  ...baseAliasEntries,
];

export default mergeConfig(
  baseConfig?.config ?? {},
  defineConfig({
    resolve: {
      alias: aliasWithOverrideFirst,
    },
    server: {
      port: 5274,
      strictPort: true,
      host: "127.0.0.1",
    },
  }),
);
