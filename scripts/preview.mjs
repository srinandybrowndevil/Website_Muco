import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const next = resolve(root, "workspaces/node_modules/next/dist/bin/next");
if (!existsSync(next)) throw new Error("Install workspace dependencies first: npm install --prefix workspaces");
const entries = [
  { name: "website", port: 8123, cwd: root, args: [resolve(root, "scripts/dev-site.mjs")] },
  ...[["admin", 3101], ["employee", 3102], ["intern", 3103], ["client", 3104]].map(([name, port]) => ({ name, port, cwd: resolve(root, `workspaces/apps/${name}`), args: [next, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)] })),
];
for (const entry of entries) {
  await new Promise((resolvePort, reject) => {
    const socket = createServer();
    socket.once("error", () => reject(new Error(`Port ${entry.port} is in use. Stop its existing development server before running the local preview.`)));
    socket.listen(entry.port, "127.0.0.1", () => socket.close(resolvePort));
  });
}
const logs = resolve(root, ".local-logs");
mkdirSync(logs, { recursive: true });
const env = { ...process.env, NODE_ENV: "development", NEXT_PUBLIC_LOCAL_PREVIEW: "1", MUCO_PREVIEW_DIR: resolve(root, ".local-preview"), NEXT_TELEMETRY_DISABLED: "1" };
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const entry of entries) {
  const output = createWriteStream(resolve(logs, `preview-${entry.name}.log`), { flags: "a" });
  const child = spawn(process.execPath, entry.args, { cwd: entry.cwd, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.stdout.pipe(output); child.stderr.pipe(output);
  child.once("error", error => { console.error(`${entry.name}: ${error.message}`); stop(1); });
  child.once("exit", code => { if (!stopping) { console.error(`${entry.name} stopped (${code}). See .local-logs/preview-${entry.name}.log`); stop(code || 1); } });
  console.log(`${entry.name}: http://localhost:${entry.port}${entry.name === "website" ? "/__preview" : "/login"}`);
}
console.log("Local preview only. No credentials required. Sample edits persist in .local-preview.");
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
