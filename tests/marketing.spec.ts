import { test, expect, type Page } from "@playwright/test";
import { readdirSync } from "node:fs";

// Every page the generator produces, discovered rather than listed, so a new
// page is covered the day it is written instead of the day someone remembers
// to add it here. Playwright runs from the directory holding its config, which
// is the repository root, and this package is an ES module -- so no __dirname.
// Locale subdirectories are part of that discovery. The Tamil pages shipped
// with every asset path resolved against /ta/, so they loaded with no
// stylesheet and no JavaScript -- a fault the per-page failed-request check
// below catches immediately, but only for pages it is actually given.
const LOCALES = ["ta"];
const PAGES = [
  ...readdirSync(process.cwd()).filter(name => name.endsWith(".html")),
  ...LOCALES.flatMap(locale =>
    readdirSync(`${process.cwd()}/${locale}`)
      .filter(name => name.endsWith(".html"))
      .map(name => `${locale}/${name}`)),
].sort();

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

  test("every internal link resolves", async ({ request }) => {
    // No browser. Rendering 25 pages just to read their href attributes is
    // most of a minute of work to answer a question the raw HTML already
    // answers, and it was timing out on a loaded machine.
    const targets = new Map<string, string>();   // link -> the page that has it

    for (const file of PAGES) {
      const response = await request.get(`${BASE}/${file}`);
      expect(response.status(), `${file} should serve 200`).toBe(200);
      const html = await response.text();

      for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
        const href = match[1];
        if (!href || href.startsWith("#") || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) continue;
        const target = href.split("#")[0];
        if (target && !targets.has(target)) targets.set(target, file);
      }
    }

    const broken: string[] = [];
    for (const [target, from] of targets) {
      const response = await request.get(`${BASE}/${target.replace(/^\//, "")}`);
      if (response.status() >= 400) broken.push(`${from} -> ${target} (${response.status()})`);
    }

    expect(targets.size, "links were actually found to check").toBeGreaterThan(0);
    expect(broken, "internal links that 404").toEqual([]);
  });

  // This used to assert the opposite: that WhatsApp, phone and email were all
  // routed through a client sign-in. That gate was removed deliberately -- the
  // public site asks nobody to create an account to make an enquiry -- so the
  // test now guards the replacement rule instead of the rule it replaced.
  test("contact actions are direct and need no account", async ({ request }) => {
    const html = await (await request.get(`${BASE}/contact.html`)).text();
    expect(html, "WhatsApp must be a real wa.me link").toContain('href="https://wa.me/916381809844');
    expect(html, "phone must be a real tel: link").toContain('href="tel:+916381809844"');
    expect(html, "no sign-in may appear in the public journey").not.toContain("client.mucolabs.com/login");
    expect(html, "no sign-up may appear in the public journey").not.toContain("client.mucolabs.com/signup");
  });

  test("one primary conversion, named the same everywhere", async ({ request }) => {
    for (const name of ["index.html", "services.html", "pricing.html", "work.html", "contact.html"]) {
      const html = await (await request.get(`${BASE}/${name}`)).text();
      expect(html, `${name} must not revive the second CTA`).not.toContain("Free Consultation");
      expect(html, `${name} must offer Start a Project`).toContain("Start a Project");
    }
  });

  test("learning page carries the tutor, Way2Me leadership and feedback", async ({ request }) => {
    const html = await (await request.get(`${BASE}/learning.html`)).text();
    expect(html).toContain("Srinivash Mahalingam");
    expect(html).toContain("Tutor at Way2Me");
    expect(html).toContain("Yogahari Haran");
    expect(html).toContain("Founder &amp; CEO, Way2Me");
    expect(html).toContain("What learners valued.");
    expect(html).toContain("assets/yogahari.webp");
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

    // One suite run posts twice here, desktop and mobile, against an endpoint
    // that allows five per minute per address. That is comfortably inside the
    // limit for a single run and for CI.
    //
    // It is not inside the limit if you run the suite several times in one
    // minute, or run it while poking the form by hand. A 429 then is the guard
    // in api/lead.js working exactly as intended, not a defect in the form --
    // wait a minute and run it again. It is deliberately not excused here the
    // way the analytics 429 is, because unlike analytics, a real visitor being
    // refused would be a genuine fault and this test is the thing that would
    // catch it.
    test("sends a complete enquiry and confirms it", async ({ page }) => {
      let sent: Record<string, unknown> | null = null;
      await page.route("**/api/lead", async route => {
        sent = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, recorded: false, emailed: true }) });
      });

      // Query before the fragment. Written the other way round it is not a
      // query string at all, it is part of the fragment, and every campaign
      // parameter arrives empty.
      await page.goto(`${BASE}/contact.html?utm_source=probe&utm_medium=test&utm_campaign=suite#enquiry`);
      await page.locator("#lead-name").fill("Probe Person");
      await page.locator("#lead-phone").fill("+91 90000 00000");
      // Service is a radio chip group now, not a select, and the business name
      // is optional and tucked into the optional-details disclosure.
      await page.locator(".service-chip input").first().check();
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
      // domcontentloaded, not load: this asserts two attributes on an element
      // in the markup and needs nothing that arrives later. Waiting for fonts,
      // images and the analytics beacon took about thirty seconds under a
      // parallel run and intermittently blew the sixty-second budget, which
      // made a passing check look like a failing one.
      await page.goto(OPEN, { waitUntil: "domcontentloaded" });
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
      // Service is a radio chip group now, not a select, and the business name
      // is optional and tucked into the optional-details disclosure.
      await page.locator(".service-chip input").first().check();
      await page.locator("#lead-message").fill("Something short.");
      await page.locator("#lead-consent").check();
      await page.locator("#lead-submit").click();

      await expect(page.locator("#lead-status")).toHaveClass(/form-status-err/);
      await expect(page.locator("#lead-status")).toContainText(/whatsapp/i);
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

test.describe("contrast on the actions people press", () => {
  // The mobile menu sets a colour on every anchor inside it, and that selector
  // outranks the accent button's own. The primary call to action in the phone
  // menu was rendering ivory on copper at 2.31:1, under the 4.5:1 WCAG AA asks
  // for text that size, while the same button elsewhere measured 7.01:1. One
  // variant of three, and the one people reach on a phone.
  function contrast(a: number[], b: number[]) {
    const lum = (c: number[]) => {
      const [r, g, bl] = c.map(v => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    };
    const [l1, l2] = [lum(a), lum(b)];
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  test("every button and link in the mobile menu meets WCAG AA", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("http://localhost:8123/index.html");
    await page.evaluate(() => document.querySelector(".mobile-menu")?.classList.add("open"));

    const measured = await page.evaluate(() => {
      const menu = document.querySelector(".mobile-menu");
      if (!menu) return [];
      const menuBg = getComputedStyle(menu).backgroundColor;
      return [...menu.querySelectorAll("a, button")]
        .filter(el => el.textContent?.trim())
        .map(el => {
          const s = getComputedStyle(el);
          const transparent = s.backgroundColor.includes("rgba(0, 0, 0, 0)");
          const size = parseFloat(s.fontSize);
          return {
            text: (el.textContent || "").trim().slice(0, 30),
            fg: (s.color.match(/[\d.]+/g) || []).slice(0, 3).map(Number),
            bg: ((transparent ? menuBg : s.backgroundColor).match(/[\d.]+/g) || []).slice(0, 3).map(Number),
            large: size >= 24 || (size >= 18.66 && parseInt(s.fontWeight) >= 700),
          };
        });
    });

    expect(measured.length, "the mobile menu should have items to measure").toBeGreaterThan(5);
    for (const item of measured) {
      const ratio = contrast(item.fg, item.bg);
      const needed = item.large ? 3 : 4.5;
      expect(ratio, `"${item.text}" contrast`).toBeGreaterThanOrEqual(needed);
    }
  });
});

test.describe("Tamil locale", () => {
  const PAIRS = [
    ["/", "/ta"],
    ["/services", "/ta/services"],
    ["/about", "/ta/about"],
    ["/contact", "/ta/contact"],
  ];

  for (const [en, ta] of PAIRS) {
    test(`${ta} declares Tamil and pairs with ${en}`, async ({ page }) => {
      await page.goto(`${BASE}${ta}`, { waitUntil: "load" });
      await expect(page.locator("html")).toHaveAttribute("lang", "ta-IN");

      // Both sides of an hreflang pair must name both URLs, or search engines
      // discard the annotation entirely. Asserting one direction would pass
      // while the pair was still broken.
      for (const [href, lang] of [[en, "en-in"], [ta, "ta-in"]] as const) {
        const expected = `https://mucolabs.com${href === "/" ? "/" : href}`;
        await expect(
          page.locator(`link[rel=alternate][hreflang="${lang}"]`),
          `${ta} should point ${lang} at ${expected}`,
        ).toHaveAttribute("href", expected);
      }

      await page.goto(`${BASE}${en}`, { waitUntil: "load" });
      await expect(
        page.locator('link[rel=alternate][hreflang="ta-in"]'),
        `${en} should point back at ${ta}`,
      ).toHaveAttribute("href", `https://mucolabs.com${ta}`);
    });
  }

  test("the stylesheet actually applies on a locale page", async ({ page }) => {
    // /ta happened to work while /ta/about did not, because a path with no
    // trailing slash resolves relative assets against the root. Assert on the
    // nested page, which is the one that broke, and compare against the English
    // page rather than a hardcoded colour so a palette change does not read as
    // a missing stylesheet.
    await page.goto(`${BASE}/about`, { waitUntil: "load" });
    const english = await page.locator("body").evaluate(
      el => getComputedStyle(el).backgroundColor);

    await page.goto(`${BASE}/ta/about`, { waitUntil: "load" });
    const body = page.locator("body");
    await expect(body, "a locale page should load the same stylesheet")
      .toHaveCSS("background-color", english);
    const family = await body.evaluate(el => getComputedStyle(el).fontFamily);
    expect(family, "Tamil pages should request a Tamil-capable face")
      .toContain("Tamil");
  });

  test("a reader can get to Tamil and back without a dead end", async ({ page }) => {
    await page.goto(`${BASE}/ta`, { waitUntil: "load" });
    await page.locator("header a.lang-switch").click();
    await expect(page).toHaveURL(`${BASE}/`);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-IN");
  });

  test("no page offers a Tamil version that does not exist", async ({ page }) => {
    for (const [, ta] of PAIRS) {
      const response = await page.goto(`${BASE}${ta}`, { waitUntil: "commit" });
      expect(response?.status(), `${ta} is advertised by hreflang and must serve 200`).toBe(200);
    }
  });
});

test.describe("service preselection", () => {
  // Over a hundred CTAs link to /contact?service=<name>. That parameter stopped
  // preselecting anything the day the dropdown became radio chips, and nothing
  // failed -- the visitor just had to pick again the thing they had clicked.
  const SERVICE = "Digital marketing & SEO";

  test("a service link preselects the service it came from", async ({ page }) => {
    await page.goto(
      `${BASE}/contact?service=${encodeURIComponent(SERVICE)}#start-project`,
      { waitUntil: "load" },
    );
    await expect(page.locator("input[name=service]:checked")).toHaveValue(SERVICE);
  });

  test("arriving with no service leaves the choice empty", async ({ page }) => {
    await page.goto(`${BASE}/contact`, { waitUntil: "load" });
    await expect(page.locator("input[name=service]:checked")).toHaveCount(0);
  });

  test("a service name that is not on the form selects nothing", async ({ page }) => {
    await page.goto(`${BASE}/contact?service=Rocket%20surgery`, { waitUntil: "load" });
    await expect(page.locator("input[name=service]:checked")).toHaveCount(0);
  });

  test("the direct contact routes are reachable without scrolling past the form", async ({ page }) => {
    await page.goto(`${BASE}/contact`, { waitUntil: "load" });
    const lines = page.locator(".contact-line");
    await expect(lines).toHaveCount(3);
    await expect(page.locator('.contact-line[href^="mailto:"]')).toContainText("@");
    for (const line of await lines.all()) {
      const icon = line.locator(".contact-line-icon svg");
      await expect(icon).toBeVisible();
      // An icon element that renders nothing looks like a styling bug, and the
      // WhatsApp mark shipped exactly that way from a None entry in the set.
      expect(await icon.evaluate(el => el.innerHTML.trim().length)).toBeGreaterThan(0);
    }
  });
});

test.describe("service pages close with the enquiry form", () => {
  const CASES = [
    ["services-websites", "Website design & development"],
    ["services-marketing", "Digital marketing & SEO"],
    ["services-support", "Branding, IT & cloud support"],
  ] as const;

  for (const [slug, service] of CASES) {
    test(`${slug} arrives with its own service chosen`, async ({ page }) => {
      await page.goto(`${BASE}/${slug}`, { waitUntil: "load" });
      await expect(page.locator("input[name=service]:checked")).toHaveValue(service);
      // The hero button should reach the form on this page rather than loading
      // /contact to ask the same question over again.
      await expect(
        page.locator('.page-header a.btn-accent, section a.btn-accent').first(),
      ).toHaveAttribute("href", "#start-project");
    });
  }

  test("no page uses an id twice", async ({ page }) => {
    // The shared contact section and the form inside it both claimed
    // #start-project, the anchor every CTA on the site points at.
    for (const slug of ["contact", "services-websites", "website-audit"]) {
      await page.goto(`${BASE}/${slug}`, { waitUntil: "load" });
      const dupes = await page.evaluate(() => {
        const seen: Record<string, number> = {};
        for (const el of Array.from(document.querySelectorAll("[id]"))) {
          seen[el.id] = (seen[el.id] || 0) + 1;
        }
        return Object.entries(seen).filter(([, n]) => n > 1).map(([id]) => id);
      });
      expect(dupes, `${slug} repeats these ids`).toEqual([]);
    }
  });
});

test.describe("the header stays put", () => {
  // It was declared sticky and never stuck: overflow-x:hidden on html and body
  // computes overflow-y to auto, which makes them scroll containers, and a
  // sticky element inside one sticks to that box rather than to the viewport.
  // Nothing reported it, because the CSS was perfectly valid.
  for (const slug of ["", "services", "work", "contact"]) {
    test(`/${slug} keeps the nav on screen when you scroll`, async ({ page }) => {
      await page.goto(`${BASE}/${slug}`, { waitUntil: "load" });
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo(0, 1400);
      });
      await expect
        .poll(() => page.evaluate(
          () => Math.round(document.querySelector("header")!.getBoundingClientRect().top)))
        .toBe(0);

      // Pinning the header is worth nothing if the page now scrolls sideways.
      const overflows = await page.evaluate(() => {
        const d = document.documentElement;
        return d.scrollWidth > d.clientWidth + 1;
      });
      expect(overflows, `/${slug} scrolls horizontally`).toBe(false);
    });
  }
});

test.describe("the pricing columns read across", () => {
  test("every row of the three cards sits on one line", async ({ page }) => {
    // The cards matched on the outside -- same height, titles and buttons on the
    // same baseline -- while the feature lists started 24px apart, because one
    // description is a single line where the others wrap to two. Reading across
    // the row, the lists were the thing that looked broken.
    await page.goto(`${BASE}/pricing`, { waitUntil: "load" });

    const rows = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".price-card"));
      const topsOf = (sel: string) =>
        cards.map(c => {
          const el = c.querySelector(sel);
          return el ? Math.round(el.getBoundingClientRect().top) : null;
        });
      return {
        count: cards.length,
        title: topsOf("h3"),
        tagline: topsOf(".price-tagline"),
        list: topsOf("ul"),
        button: topsOf(".btn"),
        sideBySide: new Set(cards.map(c => Math.round(c.getBoundingClientRect().top))).size === 1,
      };
    });

    expect(rows.count).toBe(3);

    // Only meaningful while the cards are side by side. Stacked into one column
    // on a phone they are supposed to sit at different heights, and asserting
    // otherwise would be asserting a bug.
    if (!rows.sideBySide) {
      test.skip(true, "cards are stacked at this width, so rows cannot align");
    }
    for (const [name, tops] of Object.entries(rows)) {
      if (name === "count" || name === "sideBySide") continue;
      const unique = new Set(tops as number[]);
      expect(unique.size, `${name} sits at ${JSON.stringify(tops)} instead of one line`).toBe(1);
    }
  });
});

test.describe("both directions of the language switch", () => {
  const TWINS = [["/", "/ta"], ["/services", "/ta/services"],
                 ["/about", "/ta/about"], ["/contact", "/ta/contact"]] as const;

  for (const [en, ta] of TWINS) {
    test(`${en} offers its Tamil version`, async ({ page }) => {
      // The Tamil pages have linked back to English since they shipped. Going
      // the other way, the only signal a Tamil version existed was the
      // <link rel="alternate"> in the head, which no visitor ever sees.
      await page.goto(`${BASE}${en}`, { waitUntil: "load" });
      const link = page.locator(`header a[href="${ta}"]`).first();
      await expect(link).toHaveAttribute("hreflang", "ta-in");
      // lang on the anchor tells a screen reader to change pronunciation for
      // the link text, which is in Tamil script.
      await expect(link).toHaveAttribute("lang", "ta-IN");
    });
  }

  test("a page with no Tamil version offers none", async ({ page }) => {
    await page.goto(`${BASE}/work`, { waitUntil: "load" });
    await expect(page.locator('header a[href^="/ta"]')).toHaveCount(0);
  });

  test("every service radio carries its own error description", async ({ page }) => {
    // aria-describedby on the <fieldset> is never read out for the radio that
    // has focus, so the error text was unreachable for the one field that is
    // a group rather than a single input.
    await page.goto(`${BASE}/contact`, { waitUntil: "load" });
    const radios = page.locator('input[name="service"]');
    const total = await radios.count();
    expect(total).toBeGreaterThan(1);
    for (let i = 0; i < total; i++) {
      await expect(radios.nth(i)).toHaveAttribute("aria-describedby", "err-service");
    }
    // One `required` satisfies a radio group; eleven made a screen reader say
    // "required" on every option as the user arrowed through.
    expect(await page.locator('input[name="service"][required]').count()).toBe(1);
  });
});

// The Website Preview studio. The page itself is already covered by the
// discovery loop above; these cover the three promises that are easy to break
// silently and impossible to notice from a screenshot.
test.describe("website preview studio", () => {
  const PREVIEW = `${BASE}/website-preview?demo=1`;

  /** Fill the wizard from a demo preset and land on the design picker. */
  async function generate(page: Page) {
    await page.goto(PREVIEW, { waitUntil: "load" });
    await page.locator('a[href="#/create"]').first().click();
    await page.locator('[data-demo="0"]').click();
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-wizard] button[type="submit"]').click();
    }
    await expect(page.locator(".wp-card")).toHaveCount(5);
  }

  test("required details are asked for, in words a person can act on", async ({ page }) => {
    await page.goto(PREVIEW, { waitUntil: "load" });
    await page.locator('a[href="#/create"]').first().click();
    await page.locator('[data-wizard] button[type="submit"]').click();

    // Three errors, and none of them says "this field is required".
    const errors = await page.locator(".wp-error").allTextContents();
    expect(errors).toHaveLength(3);
    for (const message of errors) expect(message).not.toMatch(/required/i);
    // Focus lands on the first thing to fix rather than leaving the visitor to
    // hunt for it.
    await expect(page.locator("#wp-businessName")).toBeFocused();
  });

  test("the five concepts are five different websites, not five palettes", async ({ page }) => {
    await generate(page);
    // The previews are built as their card nears the viewport. On a phone the
    // five cards are stacked, so reaching them means scrolling past each one
    // rather than scrolling to the grid.
    const cards = page.locator(".wp-card");
    for (let i = 0; i < 5; i++) await cards.nth(i).scrollIntoViewIfNeeded();
    await expect(page.locator(".wp-card [data-built]")).toHaveCount(5, { timeout: 15000 });

    // Measured, not asserted: the properties that would be identical if these
    // were one layout in five colours.
    const shapes = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".wp-card .wp-host")].map(host => {
        const root = host.shadowRoot!;
        const h1 = getComputedStyle(root.querySelector("h1")!);
        const header = getComputedStyle(root.querySelector("header")!);
        return [h1.fontSize, h1.fontWeight, h1.fontFamily, h1.letterSpacing,
          h1.textAlign, header.position].join("|");
      }));
    expect(shapes).toHaveLength(5);
    expect(new Set(shapes).size, "each concept needs its own composition").toBe(5);

    // And every one of them is about the visitor's business.
    const named = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".wp-card .wp-host")]
        .every(host => /SLS Gym/.test(host.shadowRoot!.textContent || "")));
    expect(named).toBe(true);
  });

  test("switching design keeps the business details and each design's own styling", async ({ page }) => {
    await generate(page);
    const business = () => page.evaluate(() => localStorage.getItem("muco.wp.business.v1"));
    const before = await business();

    await page.locator('[data-choose="premium"]').click();
    await expect(page.locator(".wp-bar-title")).toContainText("Premium");
    const premiumPrimary = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("muco.wp.custom.v1")!).premium.colors.primary);

    await page.locator("[data-back-designs]").click();
    await page.locator('[data-choose="maximal"]').click();
    await expect(page.locator(".wp-bar-title")).toContainText("Maximalist");

    // Business content is independent of presentation.
    expect(await business()).toBe(before);
    // Presentation is per design, so the new one arrives with its own palette
    // rather than inheriting the previous design's.
    const maximalPrimary = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("muco.wp.custom.v1")!).maximal.colors.primary);
    expect(maximalPrimary).not.toBe(premiumPrimary);
  });

  /**
   * Personalisation must not flatten the five designs.
   *
   * The payload is seeded through storage rather than by stubbing the network,
   * because that exercises the real merge path and does not depend on a key
   * being configured. The record below is the shape api/preview.js returns
   * after validation, so what is under test is what actually reaches the page.
   */
  const AI_PAYLOAD = {
    positioning: "A neighbourhood gym built around coached, progressive training.",
    tone: "direct, encouraging",
    hero: {
      headline: "Stronger Every Week in Erode",
      subheadline: "Coached strength and personal training, six days a week.",
      ctaLabel: "Book a Trial"
    },
    about: { heading: "About SLS Gym", body: "A training floor in Erode for people who want coaching." },
    services: [
      { title: "Strength training", description: "Barbell work coached from your first session." },
      { title: "Weight loss programme", description: "Structured training paired with simple habits." }
    ],
    faq: [{ question: "Do I need experience?", answer: "No. Every programme starts from where you are." }],
    design: {
      primaryColor: "#1f6f4a", accentColor: "#e8b53a",
      typeset: "grotesk", mood: "energetic", primaryAction: "book"
    },
    recommendedTemplate: "maximal",
    templates: {
      minimal: { headline: "Train with intent", note: "Quiet layout.", sections: ["about", "services", "contact"] },
      maximal: { headline: "STRONGER EVERY WEEK", note: "Loud and physical.", sections: ["services", "about", "contact"] },
      business: { headline: "Coached training in Erode", note: "Clear and enquirable.", sections: ["services", "about", "contact"] },
      editorial: { headline: "A floor built for progress", note: "Editorial rhythm.", sections: ["about", "services", "contact"] },
      premium: { headline: "Considered training", note: "Refined and unhurried.", sections: ["about", "services", "contact"] }
    }
  };

  /** Seed a business plus a matching personalisation record, then open designs. */
  async function seedPersonalised(page: Page) {
    await page.goto(PREVIEW, { waitUntil: "load" });
    await page.evaluate((payload) => {
      const biz = {
        businessName: "SLS Gym", category: "gym", location: "Erode", tagline: "",
        description: "", services: ["Strength training", "Weight loss programme"],
        products: [], address: "", phone: "6381809844", whatsapp: "", email: "",
        instagram: "", facebook: "", mapsUrl: "", language: "en",
        preferredMode: "recommended", preferredPrimaryColor: ""
      };
      // The same fingerprint the studio computes, so the record counts as current.
      const parts = [biz.businessName, biz.category, biz.location, biz.tagline,
        biz.description, biz.services.join("|"), biz.products.join("|"),
        biz.language, biz.preferredPrimaryColor].join("");
      let hash = 5381;
      for (let i = 0; i < parts.length; i++) hash = ((hash << 5) + hash + parts.charCodeAt(i)) | 0;
      localStorage.clear();
      localStorage.setItem("muco.wp.business.v1", JSON.stringify(biz));
      localStorage.setItem("muco.wp.ai.v1", JSON.stringify({
        fingerprint: String(hash >>> 0) + "." + parts.length, source: "ai", payload
      }));
    }, AI_PAYLOAD);
    // A goto that differs only by fragment is a same-document navigation: the
    // script would not re-run and the studio would still hold the pre-seed
    // state. The extra parameter forces a real load.
    await page.goto(`${BASE}/website-preview?demo=1&seeded=1#/designs`, { waitUntil: "load" });
    const cards = page.locator(".wp-card");
    await expect(cards).toHaveCount(5);
    for (let i = 0; i < 5; i++) await cards.nth(i).scrollIntoViewIfNeeded();
    await expect(page.locator(".wp-card [data-built]")).toHaveCount(5, { timeout: 15000 });
  }

  test("personalised copy reaches every concept without collapsing them", async ({ page }) => {
    await seedPersonalised(page);

    const shapes = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".wp-card .wp-host")].map(host => {
        const root = host.shadowRoot!;
        const h1 = getComputedStyle(root.querySelector("h1")!);
        return {
          headline: root.querySelector("h1")!.textContent!.trim(),
          shape: [h1.fontFamily, h1.fontWeight, h1.fontSize, h1.letterSpacing].join("|"),
          usesGeneratedCopy: /Barbell work coached/.test(root.textContent || "")
        };
      }));

    // Each concept carries the headline written for it.
    expect(shapes.map(s => s.headline)).toEqual([
      "Train with intent", "STRONGER EVERY WEEK", "Coached training in Erode",
      "A floor built for progress", "Considered training"
    ]);
    // And the generated service copy.
    expect(shapes.every(s => s.usesGeneratedCopy)).toBe(true);

    // The failure this guards against: one suggested typeface applied to all
    // five turned every family into the same voice. The suggestion belongs to
    // the recommended design only.
    expect(new Set(shapes.map(s => s.shape)).size,
      "personalisation must not flatten the five typographic voices").toBe(5);

    const families = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".wp-card .wp-host")].map(host =>
        getComputedStyle(host.shadowRoot!.querySelector("h1")!).fontFamily.split(",")[0]));
    expect(new Set(families).size,
      "at least three distinct typefaces across the five").toBeGreaterThan(2);
  });

  test("one design is recommended, and all five remain choosable", async ({ page }) => {
    await seedPersonalised(page);
    await expect(page.locator(".wp-pick-badge")).toHaveCount(1);
    await expect(page.locator(".wp-pick-badge")).toHaveText("Recommended for your business");
    await expect(page.locator("[data-choose]")).toHaveCount(5);
    // A recommendation, not a promise about results.
    const text = (await page.locator(".wp-cards").textContent()) || "";
    expect(text).not.toMatch(/best converting|guaranteed|more sales/i);
  });

  test("with no key configured the studio still produces five concepts", async ({ page }) => {
    // Nothing is stubbed: there is no key in CI, so this is the real fallback.
    await generate(page);
    await expect(page.locator(".wp-card")).toHaveCount(5);
    await expect(page.locator(".wp-notice")).toContainText("standard website content system");
    const stored = await page.evaluate(() => localStorage.getItem("muco.wp.ai.v1"));
    expect(JSON.parse(stored!).source).toBe("fallback");
    expect(JSON.parse(stored!).payload).toBe(null);
  });

  test("approval is honest about having sent nothing", async ({ page }) => {
    /* V2 does send business details to our own /api/preview, so "nothing leaves
       the browser" is no longer true and this test does not pretend it is. Two
       narrower promises are what actually matter, and both are checked here:
       contact details never leave, and approval submits nothing at all.
       Site-wide analytics beacons are a separate, consent-gated subject and
       carry no preview data, so only our own origin is watched. */
    const posted: { url: string; body: string }[] = [];
    page.on("request", request => {
      if (request.method() === "GET") return;
      if (!request.url().startsWith(BASE)) return;
      posted.push({ url: request.url(), body: request.postData() || "" });
    });

    await generate(page);

    const personalisation = posted.filter(r => r.url.includes("/api/preview"));
    const other = posted.filter(r => !r.url.includes("/api/preview"));
    expect(other, "nothing but personalisation may be posted").toEqual([]);
    expect(personalisation.length,
      "one personalisation request per generation, not one per concept")
      .toBeLessThanOrEqual(1);

    // The demo preset carries a phone number. It must never be transmitted.
    for (const request of personalisation) {
      expect(request.body).not.toContain("6381809844");
      expect(request.body.toLowerCase()).not.toContain("whatsapp");
    }

    const beforeApproval = posted.length;
    await page.locator('[data-choose="business"]').click();
    await page.locator("[data-approve-step]").click();
    await page.locator("[data-approve]").click();

    await expect(page.locator(".wp-done h2")).toHaveText("Your website concept is ready.");
    await expect(page.locator(".wp-done p"))
      .toContainText("Nothing has been sent to MUCO LABS yet");
    expect(posted.length, "choosing and approving must submit nothing")
      .toBe(beforeApproval);
  });
});
