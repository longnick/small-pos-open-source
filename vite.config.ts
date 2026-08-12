import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  // GitHub Pages serves this project under /small-pos-open-source/.
  base: "/small-pos-open-source/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@pos/core": path.resolve(__dirname, "packages/pos-core/src"),
      "@pos/storage": path.resolve(__dirname, "packages/pos-storage/src"),
      "@pos/ui": path.resolve(__dirname, "packages/pos-ui/src"),
      "@pos/module-sdk": path.resolve(__dirname, "packages/module-sdk/src"),
      "@pos/module-registry": path.resolve(__dirname, "packages/module-registry/src"),
    },
  },
});
