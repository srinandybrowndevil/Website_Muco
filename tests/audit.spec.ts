/**
 * A sweep, not a suite.
 *
 * tests/marketing.spec.ts asserts specific promises. This walks every page the
 * way a visitor would, at three widths, and reports anything that looks wrong --
 * so problems nobody wrote a test for still surface. It is deliberately noisy:
 * read the output, fix what is real, ignore what is not.
 *
 * Not wired into CI on purpose. It is a diagnostic to run when auditing, not a
 * gate that has to stay green.
 */
import { test, type Page } from "@playwright/test";
import { readdirSync } from "node:fs";

const BASE = "http://localhost:8123";
const PAGES = readdirSync(process.cwd())
  .filter(name => name.endsWith(".html") && name !== "404.html")
  .map(name => (name === "index.html" ? "/" : "/" + name.replace(/\.html$/, "")))
  .sort();

const WIDTHS = [320, 768, 1280];
const findings: string[] = [];
const note = (where: string, what: string) => findings.push(`${where} :: ${what}`);

test("sweep every page at three widths", async ({ browser }) => {
  test.setTimeout(20 * 60 * 1000);
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  const failed: string[] = [];
  page.on("console", m => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/429 \(Too Many Requests\)/.test(t)) return;
    consoleErrors.push(t);
  });
  page.on("pageerror", e => consoleErrors.push("uncaught: " + e.message));
  page.on("requestfailed", r => {
    const u = r.url();
    if (/google-analytics|googletagmanager|clarity\.ms|bing\.com/.test(u)) return;
    failed.push(`${r.method()} ${u} — ${r.failure()?.errorText}`);
  });

  for (const path of PAGES) {
    for (const width of WIDTHS) {
      consoleErrors.length = 0;
      failed.length = 0;
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(BASE + path, { waitUntil: "load" });
      const where = `${path} @${width}`;

      if (response?.status() !== 200) note(where, `HTTP ${response?.status()}`);
      consoleErrors.forEach(e => note(where, "console: " + e));
      failed.forEach(f => note(where, "request failed: " + f));

      const audit = await page.evaluate((w) => {
        const out: string[] = [];
        const de = document.documentElement;

        // Sideways scroll is the single most common phone defect.
        const overflow = de.scrollWidth - de.clientWidth;
        if (overflow > 1) {
          const wide = [...document.querySelectorAll<HTMLElement>("body *")]
            .filter(el => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.right > de.clientWidth + 1 &&
                getComputedStyle(el).position !== "fixed";
            })
            .slice(0, 3)
            .map(el => `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`);
          out.push(`horizontal overflow ${overflow}px (${wide.join(", ") || "source unclear"})`);
        }

        // Anything a finger has to hit.
        const small: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(
          "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none") continue;
          // Inline links inside running text are exempt; they are not controls.
          if (el.tagName === "A" && el.closest("p, li, dd, .faq-body, figcaption, small")) continue;
          if (r.height < 24 || r.width < 24) {
            small.push(`${el.tagName.toLowerCase()}"${(el.textContent || "").trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
        }
        if (small.length) out.push(`small tap targets: ${small.slice(0, 4).join(" | ")}`);

        // Images that occupy layout but produced no pixels.
        for (const img of document.querySelectorAll<HTMLImageElement>("img")) {
          if (img.complete && img.naturalWidth === 0) out.push(`broken image: ${img.src}`);
          if (!img.hasAttribute("alt")) out.push(`img without alt: ${img.src}`);
        }

        // Text that would be unreadable on a phone.
        if (w <= 375) {
          const tiny = new Set<string>();
          for (const el of document.querySelectorAll<HTMLElement>("p, li, span, a, td, dd, small")) {
            if (!el.textContent?.trim()) continue;
            const size = parseFloat(getComputedStyle(el).fontSize);
            if (size && size < 11) tiny.add(`${el.tagName.toLowerCase()} ${size}px`);
          }
          if (tiny.size) out.push(`text under 11px: ${[...tiny].slice(0, 4).join(", ")}`);
        }

        // A focus ring removed with nothing in its place makes the site
        // unusable by keyboard.
        const first = document.querySelector<HTMLElement>("a[href], button");
        if (first) {
          first.focus();
          const cs = getComputedStyle(first);
          if (cs.outlineStyle === "none" && cs.boxShadow === "none") {
            out.push("first control has no visible focus indicator");
          }
        }

        // An empty heading or an empty link is invisible to a screen reader.
        for (const el of document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,a[href],button")) {
          const label = (el.textContent || "").trim() ||
            el.getAttribute("aria-label") || el.getAttribute("title") || "";
          const hasImg = !!el.querySelector("img, svg");
          if (!label && !hasImg && el.offsetParent !== null) {
            out.push(`empty ${el.tagName.toLowerCase()}`);
          }
        }
        return out;
      }, width);

      audit.forEach(a => note(where, a));
    }
  }

  await context.close();

  console.log("\n================ SWEEP RESULTS ================");
  if (!findings.length) console.log("Nothing found.");
  const grouped = new Map<string, string[]>();
  for (const f of findings) {
    const [where, what] = f.split(" :: ");
    if (!grouped.has(what)) grouped.set(what, []);
    grouped.get(what)!.push(where);
  }
  for (const [what, wheres] of [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n[${wheres.length}] ${what}`);
    console.log(`      ${wheres.slice(0, 6).join(", ")}${wheres.length > 6 ? ", …" : ""}`);
  }
  console.log("\n===============================================\n");
});
