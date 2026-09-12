import { defineConfig, devices } from "@playwright/test";

// Five servers in one run: the marketing site and the four workspaces.
//
// They are exercised together because the failures that matter cross between
// them. The marketing site links into client.mucolabs.com, the four workspaces
// redirect between each other, and portal.mucolabs.com has to keep answering.
// None of those is visible to a suite that tests one application at a time.
//
// Playwright starts all five itself, so a run needs nothing set up by hand and
// can be dropped into CI unchanged.
export default defineConfig({
  testDir: "./tests",
  testIgnore: "**/preview/**",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Deliberately capped rather than left to default half-the-cores. The Next
  // dev server compiles routes on demand while these run, so four browser
  // contexts plus Turbopack starve each other: pages that answer curl in
  // 0.2 seconds were timing out at sixty, and a different test failed on each
  // run. That reads as a flaky suite, which is worse than a slow one, because
  // people stop believing a red result.
  //
  // Retries stay at zero on purpose. A retry would have hidden this rather
  // than made anyone fix it.
  workers: 3,
  // The long pages scroll twelve screens to trigger lazy images before
  // asserting, and this machine reports a slow filesystem. Thirty seconds was
  // tight enough that a healthy page failed on the clock rather than on
  // anything true; sixty turned out to be the same story one step further out.
  //
  // Measured rather than guessed: work.html answers curl in 0.22s and the test
  // takes about ten seconds run alone, but six times that under a full
  // parallel run competing with the Next dev server. Nothing here is testing
  // how fast the machine is, so the clock should not be able to fail a page.
  // A genuinely broken page still fails on an assertion, which no timeout hides.
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // A real phone profile rather than a narrow desktop window: touch, device
    // pixel ratio and user agent all change what the page does.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "node scripts/dev-site.mjs 8123",
      url: "http://localhost:8123/index.html",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    // One per workspace, on the ports @muco/core names. The proxy reads the
    // Host header rather than the port, so admin.localhost:3101 and
    // portal.localhost:3104 both reach the right application without DNS or a
    // hosts file -- every current browser resolves *.localhost.
    {
      command: "npm run dev --workspace @muco/admin --prefix workspaces",
      url: "http://localhost:3101/login",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "npm run dev --workspace @muco/employee --prefix workspaces",
      url: "http://localhost:3102/login",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "npm run dev --workspace @muco/intern --prefix workspaces",
      url: "http://localhost:3103/login",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "npm run dev --workspace @muco/client --prefix workspaces",
      url: "http://localhost:3104/login",
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
