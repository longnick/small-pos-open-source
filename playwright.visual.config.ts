import { defineConfig } from "@playwright/test";

const port = 5277;

export default defineConfig({
  testDir: "e2e",
  testMatch: "visual-tablet-desktop.spec.ts",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  projects: [
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx vite --config vite.order-entry-e2e.config.ts --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
