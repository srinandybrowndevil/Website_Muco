import { cpSync, existsSync, mkdirSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));

// Generate the pages before packaging them. This step used to be missing: the
// deploy copied whatever .html happened to be committed, so an edit to
// content.py that nobody rebuilt locally shipped nothing and the site could sit
// arbitrarily far behind its own source -- CI caught the drift only after a
// push. Running the generator here makes the deployed HTML the source, by
// construction.
// Pick the interpreter before building, rather than trying build.py with each
// candidate in turn. On Windows "python3" is an App Execution Alias that exits
// 9009 instead of ENOENT, so a "try it and catch ENOENT" fallback never moves on
// -- and worse, a genuine build.py failure would be indistinguishable from a
// missing interpreter. Probing --version separates the two.
const python = ["python3", "python"].find(candidate => {
  try {
    execFileSync(candidate, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
});
if (!python) throw new Error("No working python3 or python on PATH; cannot generate the site from build.py.");
execFileSync(python, ["build.py"], { cwd: root, stdio: "inherit" });
const output = resolve(root, "public-site");
if (existsSync(output)) rmSync(output, { recursive: true });
mkdirSync(output, { recursive: true });
// Locale subdirectories that hold built pages. Must match the prefixes used
// by TAMIL_TWINS in build.py.
const LOCALE_DIRS = ["ta"];

// Deliberately package only public artifacts, excluding .env, portal source,
// raw images, SQL, tests and local configuration from the static web root.
const files = readdirSync(root).filter(name => name.endsWith(".html"));
// website-preview.css and website-preview.js are loaded by /website-preview
// alone. Leaving either out of this list builds and passes locally and then
// 404s in production, which is the one failure mode an explicit list has --
// so a page-specific asset has to be added here when it is added to a page.
files.push("style.css", "main.js", "attribution.js", "analytics.js", "website-preview.css", "website-preview.js", "robots.txt", "sitemap.xml", "llms.txt", "site.webmanifest", "favicon.svg", "logo-mark.svg", "logo-full.svg");
for (const name of files) if (existsSync(join(root, name))) copyFileSync(join(root, name), join(output, name));
cpSync(join(root, "assets"), join(output, "assets"), { recursive: true });

// Locale subdirectories. readdirSync above is not recursive, so without this
// every Tamil page built locally, passed every check, and was then left out of
// the deployed bundle -- the pages would 404 in production while looking
// perfectly fine in the repository.
let localeFiles = 0;
for (const locale of LOCALE_DIRS) {
  const from = join(root, locale);
  if (!existsSync(from)) continue;
  cpSync(from, join(output, locale), { recursive: true });
  localeFiles += readdirSync(from).filter(name => name.endsWith(".html")).length;
}

console.log(`Packaged ${files.length + localeFiles} public files and assets into public-site/`);
