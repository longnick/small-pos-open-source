#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.SMALL_POS_PORT ?? "4173";
const previewArgs = ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"];

function preview() {
  const child = spawn("npx", previewArgs, { cwd: root, stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 1));
}

if (existsSync(join(root, "dist", "index.html"))) {
  preview();
} else {
  const build = spawn("npx", ["vite", "build"], { cwd: root, stdio: "inherit" });
  build.on("exit", (code) => {
    if (code !== 0) process.exit(code ?? 1);
    else preview();
  });
}
