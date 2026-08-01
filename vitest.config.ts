import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    globals: true,
    include: ["packages/**/*.test.ts", "src/**/*.test.ts", "test/**/*.test.ts"],
  },
});
