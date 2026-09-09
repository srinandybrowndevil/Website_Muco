// Starts the portal's Next dev server with the working directory pinned to
// portal/, regardless of where the launcher was invoked from. A relative
// `npm --prefix portal` resolves against the caller's cwd, which silently
// creates a nested portal/portal/.next tree when that cwd is already portal/.
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const portalDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "portal");
// Honour PORT so the preview launcher can move the portal off a port another
// project already holds, instead of the two fighting over 3000.
const port = process.env.PORT ?? process.argv[2];
const args = port ? ["run", "dev", "--", "--port", String(port)] : ["run", "dev"];
const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", args, {
  cwd: portalDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("exit", code => process.exit(code ?? 0));
