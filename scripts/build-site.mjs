import { cpSync, existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "public-site");
mkdirSync(output, { recursive: true });
// Deliberately package only public artifacts, excluding .env, portal source,
// raw images, SQL, tests and local configuration from the static web root.
const files = readdirSync(root).filter(name => name.endsWith(".html"));
files.push("style.css", "main.js", "analytics.js", "robots.txt", "sitemap.xml", "llms.txt", "site.webmanifest", "favicon.svg", "logo-mark.svg", "logo-full.svg");
for (const name of files) if (existsSync(join(root, name))) copyFileSync(join(root, name), join(output, name));
cpSync(join(root, "assets"), join(output, "assets"), { recursive: true });
console.log(`Packaged ${files.length} public files and assets into public-site/`);
