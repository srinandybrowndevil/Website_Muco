import { test, expect, type Page } from "@playwright/test";
import { readdirSync } from "node:fs";

// Every page the generator produces, discovered rather than listed, so a new
// page is covered the day it is written instead of the day someone remembers
// to add it here. Playwright runs from the directory holding its config, which
// is the repository root, and this package is an ES module -- so no __dirname.
const PAGES = readdirSync(process.cwd())
  .filter(name => name.endsWith(".html"))
  .sort();

const BASE = "http://localhost:8123";

function collectProblems(page: Page) {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    // The analytics endpoint allows 30 events a minute per address. A full run
    // fires far more than that from one address, which no real visitor does, so
    // this 429 is the harness tripping its own guard rather than a page defect.
    // Narrowly matched on purpose: any other 429, and every other error, still
    // fails the test.
    if (/429 \(Too Many Requests\)/.test(text)) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", error => consoleErrors.push(`uncaught: ${error.message}`));
  page.on("requestfailed", request => {
    // Analytics beacons are allowed to fail locally: there is no consent and no
    // key here, and a blocked beacon is the correct outcome, not a defect.
    const url = request.url();
    if (/google-analytics|googletagmanager|clarity\.ms|bing\.com/.test(url)) return;
    failedRequests.push(`${request.method()} ${url} — ${request.failure()?.errorText}`);
  });
  return { consoleErrors, failedRequests };
}

test.describe("marketing site", () => {
  for (const file of PAGES) {
    test(`${file} loads clean`, async ({ page }) => {
      const { consoleErrors, failedRequests } = collectProblems(page);

      const response = await page.goto(`${BASE}/${file}`, { waitUntil: "load" });
      expect(response?.status(), `${file} should serve 200`).toBe(200);

      expect(consoleErrors, `${file} console errors`).toEqual([]);
      expect(failedRequests, `${file} failed requests`).toEqual([]);

      // Every image that finished loading actually produced pixels. A 404 image
      // still occupies layout, so this is the only way to catch one by machine.
      //
      // Scroll first, because most of these are lazy: an image below the fold
      // has not started loading, which is correct behaviour and not a fault.
      // Then only judge images that have finished -- complete with no width is
      // a real failure, complete still false just means not started.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState("networkidle");

      const brokenImages = await page.evaluate(() =>
        Array.from(document.images)
          .filter(img => img.complete && img.naturalWidth === 0 && (img.currentSrc || img.src))
          .map(img => img.currentSrc || img.src));
      expect(brokenImages, `${file} broken images`).toEqual([]);

      // Nothing may push the page sideways. This is the defect that only ever
      // shows on a real phone, which is why it runs at every width.
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        if (doc.scrollWidth <= doc.clientWidth + 1) return null;
        // Name the widest offender, so a failure is actionable rather than a
        // number to go hunting for.
        let worst: { tag: string; width: number } | null = null;
        for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
          const box = el.getBoundingClientRect();
          if (box.right > doc.clientWidth + 1 && (!worst || box.right > worst.width)) {
            const cls = typeof el.className === "string" && el.className ? "." + el.className.split(" ")[0] : "";
            worst = { tag: `${el.tagName.toLowerCase()}${cls}`, width: Math.round(box.right) };
          }
        }
        return { page: doc.scrollWidth, viewport: doc.clientWidth, worst };
      });
      expect(overflow, `${file} scrolls horizontally`).toBeNull();

      // Structure a screen reader depends on.
      await expect(page.locator("main"), `${file} needs one main landmark`).toHaveCount(1);
      await expect(page.locator("h1"), `${file} needs exactly one h1`).toHaveCount(1);
    });
  }

  test("every internal link resolves", async ({ page, request }) => {
    const seen = new Set<string>();
    const broken: string[] = [];

    for (const file of PAGES) {
      await page.goto(`${BASE}/${file}`);
      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
          .map(a => a.getAttribute("href") || "")
          .filter(h => h && !h.startsWith("#") && !/^(https?:|mailto:|tel:)/.test(h)));

      for (const href of hrefs) {
        const target = href.split("#")[0];
        if (!target || seen.has(target)) continue;
        seen.add(target);
        const response = await request.get(`${BASE}/${target.replace(/^\//, "")}`);
        if (response.status() >= 400) broken.push(`${file} -> ${href} (${response.status()})`);
      }
    }
    expect(broken, "internal links that 404").toEqual([]);
  });

  test("tap targets are big enough to hit", async ({ page }) => {
    // WCAG 2.2, 2.5.8: 24 by 24 CSS pixels. Checked on the homepage, which
    // carries the densest set of controls on the site.
    await page.goto(`${BASE}/index.html`);
    const small = await page.evaluate(() => {
      const results: string[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("a[href], button"))) {
        const box = el.getBoundingClientRect();
        if (box.width === 0 && box.height === 0) continue;       // hidden

        // The success criterion exempts a link sitting inside a sentence: its
        // height is set by the line-height of the text around it, and padding
        // it out would break the paragraph. Only standalone controls have to
        // meet the size, so an inline link with text either side is skipped.
        const inline = getComputedStyle(el).display === "inline";
        const parentText = (el.parentElement?.textContent || "").trim();
        const ownText = (el.textContent || "").trim();
        if (inline && parentText.length > ownText.length) continue;

        if (box.width < 24 || box.height < 24) {
          results.push(`${el.tagName.toLowerCase()} "${ownText.slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`);
        }
      }
      return results;
    });
    expect(small, "controls smaller than 24x24").toEqual([]);
  });
});
