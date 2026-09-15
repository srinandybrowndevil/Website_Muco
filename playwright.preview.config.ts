import { defineConfig, devices } from "@playwright/test";
import { setDefaultResultOrder } from "node:dns";

setDefaultResultOrder("ipv4first");

export default defineConfig({
  testDir: "./tests/preview",
  globalSetup: "./tests/preview/global-setup.ts",
  workers: 2,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"]],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "npm run preview", url: "http://localhost:8123/__preview", reuseExistingServer: true, timeout: 180_000 },
});
