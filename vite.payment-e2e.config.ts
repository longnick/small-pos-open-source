import { defineConfig, mergeConfig, loadConfigFromFile } from "vite";
import type { AliasOptions } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const base = await loadConfigFromFile({ command: "serve", mode: "development" }, path.resolve(dirname, "vite.config.ts"));
const aliases = base?.config?.resolve?.alias ?? {};
const entries: Array<{ find: string | RegExp; replacement: string }> = Array.isArray(aliases)
  ? aliases as Array<{ find: string | RegExp; replacement: string }>
  : Object.entries(aliases as Record<string, string>).map(([find, replacement]) => ({ find, replacement }));

const alias: AliasOptions = [
  { find: "@/pos/product-bootstrap", replacement: path.resolve(dirname, "e2e/fixtures/test-product-bootstrap.ts") },
  { find: "@/auth/demo-auth-adapter", replacement: path.resolve(dirname, "e2e/fixtures/test-auth-adapter.ts") },
  { find: "@/pos/demo-pos-bootstrap", replacement: path.resolve(dirname, "e2e/fixtures/test-pos-bootstrap.ts") },
  ...entries,
];

export default mergeConfig(base?.config ?? {}, defineConfig({
  resolve: { alias },
  server: { host: "127.0.0.1", port: 5275, strictPort: true },
}));
