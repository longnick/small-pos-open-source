import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@pos/core": path.resolve(__dirname, "packages/pos-core/src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    globals: true,
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx", "test/**/*.test.ts"],
  },
});
