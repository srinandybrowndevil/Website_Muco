/**
 * Mobile layout audit.
 *
 *   node scripts/mobile-audit.cjs [siteOrigin] [portalOrigin]
 *
 * Loads the marketing site and the portal at three phone/tablet widths and
 * reports the two failures that are invisible in a desktop browser but obvious
 * on a phone: a document wider than the viewport (horizontal scroll), and the
 * desktop portal nav still painted where the burger menu should have taken
 * over. Screenshots for the 390px pass land in reports/mobile/.
 *
 * Authenticated portal routes redirect to /login when the run has no session;
 * the recorded url shows which ones did, so a redirect is not read as a pass.
 */
const fs = require("node:fs");
const path = require("node:path");

const SITE = process.argv[2] || "http://localhost:8123";
const PORTAL = process.argv[3] || "http://localhost:3000";
const WIDTHS = [320, 390, 768];
const SHOT_WIDTH = 390;
const TARGETS = [
  ["site", SITE, ["/", "/contact", "/learning", "/services"]],
  ["portal", PORTAL, ["/login", "/signup", "/portal", "/portal/profile",
                      "/portal/requests/new", "/requests", "/customers"]],
];

function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    console.error("playwright is not installed. Run: npm i -D playwright && npx playwright install chrome");
    process.exit(1);
  }
}

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const outDir = path.join("reports", "mobile");
  fs.mkdirSync(outDir, { recursive: true });
  const results = [];

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    for (const [label, origin, routes] of TARGETS) {
      for (const route of routes) {
        try {
          await page.goto(origin + route, { waitUntil: "networkidle", timeout: 20000 });
        } catch (error) {
          results.push({ width, requested: origin + route, error: String(error.message || error) });
          continue;
        }
        const state = await page.evaluate(() => {
          const desktopNav = document.querySelector(".portaldesktop");
          return {
            viewport: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            desktopNavVisible: Boolean(desktopNav) && getComputedStyle(desktopNav).display !== "none",
          };
        });
        results.push({
          width,
          requested: origin + route,
          url: page.url(),
          redirected: !page.url().startsWith(origin + route),
          overflows: state.scrollWidth > state.viewport,
          ...state,
        });
        if (width === SHOT_WIDTH) {
          const name = `${label}-${route.replace(/\//g, "-").replace(/^-/, "") || "home"}.png`;
          await page.screenshot({ path: path.join(outDir, name), fullPage: true });
        }
      }
    }
  }

  fs.writeFileSync(path.join(outDir, "measurements.json"), JSON.stringify(results, null, 2));
  const failures = results.filter(r => r.error || r.overflows || r.desktopNavVisible);
  for (const f of failures) {
    console.log(f.error ? `ERROR  ${f.requested}  ${f.error}`
      : `${f.overflows ? "OVERFLOW" : "        "} ${f.desktopNavVisible ? "DESKTOP-NAV" : "           "}  ${f.width}px  ${f.url}`);
  }
  console.log(`${results.length} checks, ${failures.length} failing. Details in ${path.join(outDir, "measurements.json")}`);
  await browser.close();
  process.exitCode = failures.length ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
