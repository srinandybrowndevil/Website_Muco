import { test, expect, type Page } from "@playwright/test";

// The four front doors, and what each must be.
const DOORS = [
  { host: "admin.localhost:3100", workspace: "admin", accent: "#cf9061", deep: "/audit", becomes: "%2Fadmin%2Faudit" },
  { host: "client.localhost:3100", workspace: "client", accent: "#7fa6cc", deep: "/profile", becomes: "%2Fportal%2Fprofile" },
  { host: "intern.localhost:3100", workspace: "intern", accent: "#6ec08a", deep: "/certificate", becomes: "%2Fintern%2Fcertificate" },
  { host: "employee.localhost:3100", workspace: "employee", accent: "#a48fd0", deep: "/compensation", becomes: "%2Fstaff%2Fcompensation" },
];

function consoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(`uncaught: ${e.message}`));
  return errors;
}

test.describe("workspace front doors", () => {
  for (const door of DOORS) {
    test(`${door.host} is its own workspace`, async ({ page }) => {
      const errors = consoleErrors(page);
      await page.goto(`http://${door.host}/login`);

      // The hostname decides the workspace, and the page inherits it.
      await expect(page.locator("html")).toHaveAttribute("data-workspace", door.workspace);

      // And the colour actually reaches the controls, not just the background.
      // The first version of this theming changed the glow and left every
      // button copper, which is the whole reason this assertion is on a button.
      const accent = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
      expect(accent, `${door.workspace} accent token`).toBe(door.accent);

      const button = page.locator("form button.primary").first();
      await expect(button).toBeVisible();
      const background = await button.evaluate(el => getComputedStyle(el).backgroundColor);
      const expected = door.accent.replace("#", "");
      const rgb = [0, 2, 4].map(i => parseInt(expected.slice(i, i + 2), 16)).join(", ");
      expect(background, `${door.workspace} primary button colour`).toBe(`rgb(${rgb})`);

      expect(errors, `${door.host} console errors`).toEqual([]);
    });

    test(`${door.host} keeps a deep link through sign-in`, async ({ page }) => {
      // Signing in must not lose where the person was going. The destination is
      // carried in the workspace's own terms, because that is the only form the
      // sign-in step will keep.
      await page.goto(`http://${door.host}${door.deep}`, { waitUntil: "commit" });
      await page.waitForURL(/\/login/);
      const url = page.url();
      expect(url, `${door.host} should stay on its own address`).toContain(door.host);
      expect(url, `${door.host} should remember the destination`).toContain(`next=${door.becomes}`);
    });
  }

  test("the shared address still serves every workspace by path", async ({ page }) => {
    // portal.mucolabs.com is in several hundred published links. It must keep
    // working exactly as it did.
    await page.goto("http://localhost:3100/admin/audit", { waitUntil: "commit" });
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("next=%2Fadmin%2Faudit");
    const workspace = await page.locator("html").getAttribute("data-workspace");
    expect(workspace, "the shared address belongs to no single workspace").toBeNull();
  });
});

test.describe("sign-up", () => {
  test("refuses a breached password without creating an account", async ({ page }) => {
    const errors = consoleErrors(page);
    await page.goto("http://localhost:3100/signup");

    // Nothing may reach the account-creation call during this test. If the
    // guard is broken, this records it instead of signing somebody up.
    const attempted: string[] = [];
    await page.route("**/*", route => {
      const url = route.request().url();
      if (url.includes("supabase.co") && route.request().method() === "POST") {
        attempted.push(url);
        return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
      }
      return route.continue();
    });

    await page.getByLabel(/work email/i).fill("probe-not-a-real-signup@example.invalid");
    // Liverpool1! satisfies every local rule -- ten characters, a letter, a
    // number, a symbol, not a listed common root -- and appears in the public
    // breach corpus tens of thousands of times. That gap is what this feature
    // exists to close, so it is what the test uses.
    await page.locator("#signup-password").fill("Liverpool1!");
    await page.getByLabel(/full name/i).fill("Probe Person");
    await page.getByLabel(/phone/i).fill("+91 90000 00000");
    await page.getByLabel(/company/i).fill("Probe Co");
    await page.getByLabel(/city|location/i).fill("Erode");

    // Every local requirement is satisfied before submitting, or this proves
    // nothing about the breach check.
    const unmet = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".requirements li"))
        .filter(li => !li.className.includes("met"))
        .map(li => li.textContent));
    expect(unmet, "local password rules should all pass first").toEqual([]);

    await page.getByRole("button", { name: /create customer account/i }).click();

    await expect(page.getByText(/public data breach/i)).toBeVisible({ timeout: 15_000 });
    expect(attempted, "no account creation may be attempted").toEqual([]);
    expect(errors, "signup console errors").toEqual([]);
  });

  test("accepts a strong unique password as far as the account call", async ({ page }) => {
    await page.goto("http://localhost:3100/signup");
    await page.locator("#signup-password").fill("tamarind-lantern-97-Erode-xQ2!");
    const unmet = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".requirements li"))
        .filter(li => !li.className.includes("met"))
        .map(li => li.textContent));
    expect(unmet, "a strong passphrase should satisfy every rule").toEqual([]);
  });
});

test.describe("public pages", () => {
  for (const path of ["/login", "/signup", "/forgot-password", "/reset-password"]) {
    test(`${path} renders without errors`, async ({ page }) => {
      const errors = consoleErrors(page);
      const response = await page.goto(`http://localhost:3100${path}`);
      expect(response?.status(), `${path} status`).toBeLessThan(400);
      await expect(page.locator("h1, h2").first()).toBeVisible();

      // No sideways scroll, which on a phone is the difference between usable
      // and not.
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1 ? { page: doc.scrollWidth, viewport: doc.clientWidth } : null;
      });
      expect(overflow, `${path} scrolls horizontally`).toBeNull();
      expect(errors, `${path} console errors`).toEqual([]);
    });
  }
});
