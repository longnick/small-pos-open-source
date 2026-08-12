import { defineConfig } from "@playwright/test";

const port = 5276;

export default defineConfig({
  testDir: "e2e",
  testMatch: "order-entry.spec.ts",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: `npx vite --config vite.order-entry-e2e.config.ts --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
