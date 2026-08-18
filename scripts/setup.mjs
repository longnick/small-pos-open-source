#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const requiredMajor = 22;
const currentMajor = Number(process.versions.node.split(".")[0]);

if (!Number.isInteger(currentMajor) || currentMajor < requiredMajor) {
  console.error(`Node.js ${requiredMajor}+ required. Current: ${process.versions.node}`);
  process.exit(1);
}

try {
  createRequire(import.meta.url).resolve("vite");
} catch {
  console.error("Dependencies missing. Run `npm ci` or `npm install` first.");
  process.exit(1);
}

try {
  execFileSync("npx", ["vite", "--version"], { cwd: root, stdio: "ignore" });
} catch {
  console.error("Vite is not available. Run `npm ci` or `npm install` first.");
  process.exit(1);
}

console.log(`Small POS ${pkg.version}`);
console.log(`Node ${process.versions.node}`);
console.log("");
console.log("Dependencies look ready.");
console.log("Start the local product preview:");
console.log("  npm start");
console.log("");
console.log("Then open the printed http://127.0.0.1 URL.");
console.log("First launch shows the shop setup wizard. No demo PIN.");
console.log("Stop the server with Ctrl+C.");
