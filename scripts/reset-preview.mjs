import { closeSync, existsSync, mkdirSync, openSync, rmSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const dir = resolve(root, ".local-preview");
const files = resolve(dir, "files");
if (!files.startsWith(dir + sep) || dir !== resolve(root, ".local-preview")) throw new Error("Invalid local preview directory.");
mkdirSync(dir, { recursive: true });
const lock = resolve(dir, "store.lock");
let descriptor;
try { descriptor = openSync(lock, "wx"); }
catch { throw new Error("The preview is saving a change. Wait a moment and run the reset again."); }
try {
  const store = resolve(dir, "store.json");
  if (existsSync(store)) unlinkSync(store);
  // Only this verified preview-owned upload directory is removed.
  rmSync(files, { recursive: true, force: true });
  console.log("Local sample edits and uploads cleared. Refresh a workspace to restore the sample records.");
} finally { closeSync(descriptor); unlinkSync(lock); }
