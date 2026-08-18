import { defineConfig } from "@playwright/test";

const E2E_PORT = 5274;
const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: "e2e",
  testIgnore: [
    "payment-positive.spec.ts",
    "order-entry.spec.ts",
    "visual-tablet-desktop.spec.ts",
    "first-run.spec.ts",
    "recovery.spec.ts",
    "schema-upgrade.spec.ts",
    "sell-flow.spec.ts",
  ],
  use: { baseURL: E2E_BASE_URL },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "npx vite --config vite.e2e.config.ts --host 127.0.0.1 --port 5274",
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
