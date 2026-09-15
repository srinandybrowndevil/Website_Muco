import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const trackedOnly = process.argv.includes("--tracked");
const tracked = new Set(execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/));
const files = [...tracked].filter(file => /^workspaces\/.+\.[cm]?[jt]sx?$/.test(file));
const missing = new Set();
for (const file of files) {
  const source = readFileSync(resolve(root, file), "utf8");
  for (const [, imported] of source.matchAll(/(?:from\s*|import\s*\()\s*["'](\.[^"']+)["']/g)) {
    const stem = posix.normalize(posix.join(posix.dirname(file), imported));
    const candidates = [stem, ...[".ts", ".tsx", ".js", ".mjs", ".json", "/index.ts", "/index.tsx"].map(ext => stem + ext)];
    if (!candidates.some(candidate => trackedOnly ? tracked.has(candidate) : existsSync(resolve(root, candidate)))) missing.add(`${file} → ${imported}`);
  }
}
if (missing.size) {
  console.error(`${missing.size} source imports are missing from ${trackedOnly ? "the Git release" : "the working directory"}:\n${[...missing].join("\n")}`);
  process.exitCode = 1;
} else console.log(`Source dependencies checked in ${files.length} workspace files (${trackedOnly ? "Git release" : "working directory"}).`);
