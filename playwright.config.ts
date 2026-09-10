import { defineConfig, devices } from "@playwright/test";

// Both properties are exercised in one run, because the failures that matter
// cross between them: the marketing site links into the portal, and the portal
// is where those links have to land.
//
// Playwright starts both servers itself, so a run needs nothing set up by hand
// and can be dropped into CI unchanged.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // The long pages scroll to trigger lazy images before asserting, and this
  // machine reports a slow filesystem. Thirty seconds was tight enough that a
  // healthy page failed on the clock rather than on anything true.
  timeout: 60_000,
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
    {
      command: "npm --prefix portal run dev -- --port 3100",
      url: "http://localhost:3100/login",
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
