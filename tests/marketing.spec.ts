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
      // Bounded, or a long page spends the whole test budget scrolling. Twelve
      // screens is past the bottom of every page here, and the step is short
      // because it only has to let the lazy-load observer fire.
      await page.evaluate(async () => {
        for (let step = 0; step < 12; step++) {
          const y = step * window.innerHeight;
          if (y > document.body.scrollHeight) break;
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      // Settling, not idling: a page with an analytics beacon retrying may
      // never reach networkidle, and waiting for it would fail a healthy page.
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(400);

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

  test.describe("enquiry form", () => {
    // The endpoint is stubbed in every case below. These check the form the
    // visitor actually touches -- validation, focus, the honeypot, what each
    // failure says -- without writing a lead into the real CRM.
    const OPEN = `${BASE}/contact.html#enquiry`;

    test("refuses an empty submission and says why", async ({ page }) => {
      await page.route("**/api/lead", route => route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, errors: {
          name: "Please enter your name.",
          phone: "Please enter a number we can reach you on.",
          message: "Please tell us a little about the project.",
          consent: "Please confirm we may contact you.",
        } }),
      }));
      await page.goto(OPEN);
      await page.locator("#lead-submit").click();

      for (const field of ["name", "phone", "message", "consent"]) {
        await expect(page.locator(`#err-${field}`), `${field} error`).not.toBeEmpty();
      }
      // Focus lands on the first thing to fix, rather than leaving someone to
      // hunt for red text.
      await expect(page.locator("#lead-name")).toBeFocused();
      await expect(page.locator("#lead-name")).toHaveAttribute("aria-invalid", "true");
    });

    test("sends a complete enquiry and confirms it", async ({ page }) => {
      let sent: Record<string, unknown> | null = null;
      await page.route("**/api/lead", async route => {
        sent = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, recorded: true }) });
      });

      // Query before the fragment. Written the other way round it is not a
      // query string at all, it is part of the fragment, and every campaign
      // parameter arrives empty.
      await page.goto(`${BASE}/contact.html?utm_source=probe&utm_medium=test&utm_campaign=suite#enquiry`);
      await page.locator("#lead-name").fill("Probe Person");
      await page.locator("#lead-phone").fill("+91 90000 00000");
      await page.locator("#lead-message").fill("Orders arrive by phone and we lose them.");
      await page.locator("#lead-consent").check();
      await page.locator("#lead-submit").click();

      await expect(page.locator("#lead-status")).toHaveClass(/form-status-ok/);
      await expect(page.locator("#lead-status")).toContainText(/reached us/i);
      // The form empties, so a second enquiry does not repeat the first.
      await expect(page.locator("#lead-name")).toHaveValue("");

      expect(sent, "the endpoint received the enquiry").not.toBeNull();
      const body = sent as unknown as Record<string, unknown>;
      expect(body.name).toBe("Probe Person");
      expect(body.consent).toBe(true);
      // Where the lead came from travels with it, or attribution is guesswork.
      expect(body.utm_source).toBe("probe");
      expect(body.utm_campaign).toBe("suite");
      expect(body.page).toContain("/contact");
      // The honeypot must go out empty, or every real submission looks like a bot.
      expect(body.company_website).toBe("");
    });

    test("the honeypot is unreachable by keyboard and hidden from view", async ({ page }) => {
      await page.goto(OPEN);
      const trap = page.locator("#lead-company-website");
      await expect(trap).toHaveAttribute("tabindex", "-1");
      await expect(trap).not.toBeInViewport();
    });

    test("a refusal never leaves the visitor without a way through", async ({ page }) => {
      await page.route("**/api/lead", route => route.fulfill({
        status: 503, contentType: "application/json", body: JSON.stringify({ ok: false }),
      }));
      await page.goto(OPEN);
      await page.locator("#lead-name").fill("Probe Person");
      await page.locator("#lead-phone").fill("+91 90000 00000");
      await page.locator("#lead-message").fill("Something short.");
      await page.locator("#lead-consent").check();
      await page.locator("#lead-submit").click();

      await expect(page.locator("#lead-status")).toHaveClass(/form-status-err/);
      await expect(page.locator("#lead-status")).toContainText(/portal/i);
      // And the button comes back, so the visitor can retry.
      await expect(page.locator("#lead-submit")).toBeEnabled();
    });
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
