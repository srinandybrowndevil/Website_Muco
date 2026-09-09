// Starts the portal's Next dev server with the working directory pinned to
// portal/, regardless of where the launcher was invoked from. A relative
// `npm --prefix portal` resolves against the caller's cwd, which silently
// creates a nested portal/portal/.next tree when that cwd is already portal/.
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const portalDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "portal");
const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
  cwd: portalDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("exit", code => process.exit(code ?? 0));
