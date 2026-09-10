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

test.describe("your own account", () => {
  // /account belongs to no workspace. On a workspace address it must not be
  // rewritten to /admin/account or /intern/account, and it must not be treated
  // as trespassing in somebody else's workspace.
  for (const host of ["localhost:3100", "admin.localhost:3100", "intern.localhost:3100"]) {
    test(`${host} reaches the password page without a workspace prefix`, async ({ page }) => {
      await page.goto(`http://${host}/account/password`, { waitUntil: "commit" });
      await page.waitForURL(/\/login/);
      const url = page.url();
      expect(url, "stays on the address it was asked on").toContain(host);
      expect(url, "keeps the destination unprefixed")
        .toContain("next=%2Faccount%2Fpassword");
    });
  }
});

test.describe("an account that has been switched off", () => {
  // The rule itself is enforced in the database and proved there, against
  // production, by disabling a real membership inside a transaction and
  // watching every policy stop answering. What these checks cover is the part
  // a person actually meets: being told what happened, on whichever address
  // they use, instead of being bounced to the sign-up form.
  for (const host of ["localhost:3100", "intern.localhost:3100", "employee.localhost:3100"]) {
    test(`${host} explains it rather than offering onboarding`, async ({ page }) => {
      const errors = consoleErrors(page);
      await page.goto(`http://${host}/login?access=closed`);

      await expect(page.getByText(/this account has been switched off/i)).toBeVisible();
      // The wrong destination is the whole point of the check: sending someone
      // whose access was just revoked to "create an account" would invite them
      // to sign themselves straight back in.
      await expect(page).toHaveURL(/\/login/);
      expect(page.url(), "stays on the address it was asked on").toContain(host);
      expect(errors, `${host} console errors`).toEqual([]);
    });
  }

  test("an ordinary sign-in page says nothing of the kind", async ({ page }) => {
    // Guards against the notice being pinned open, which would tell every
    // visitor their account was revoked.
    await page.goto("http://localhost:3100/login");
    await expect(page.getByText(/switched off/i)).toHaveCount(0);
  });
});

test.describe("the screens built for the roles checklist", () => {
  // Every one of these covers a rule that was already enforced in the database
  // and had no screen, so the founder did the job in SQL. What is checked here
  // is the thing a route can be checked for without a session: that it exists,
  // that it is protected, and that it does not quietly 404 -- a page that
  // returns "not found" is indistinguishable from one that was never built.
  const GUARDED = [
    ["/intern/profile", "%2Fintern%2Fprofile"],
    ["/intern/help", "%2Fintern%2Fhelp"],
    ["/staff/profile", "%2Fstaff%2Fprofile"],
    ["/staff/mentees", "%2Fstaff%2Fmentees"],
    ["/admin/certificates", "%2Fadmin%2Fcertificates"],
    ["/admin/grants", "%2Fadmin%2Fgrants"],
    ["/admin/compensation", "%2Fadmin%2Fcompensation"],
    ["/portal/invoices", "%2Fportal%2Finvoices"],
  ];

  for (const [path, encoded] of GUARDED) {
    test(`${path} exists and asks for sign-in`, async ({ page }) => {
      const response = await page.goto(`http://localhost:3100${path}`, { waitUntil: "commit" });
      expect(response?.status(), `${path} should not be a 404`).toBeLessThan(400);
      await page.waitForURL(/\/login/);
      expect(page.url(), `${path} should remember where it was going`).toContain(`next=${encoded}`);
    });
  }

  test("the client invoice list is reachable at its own address", async ({ page }) => {
    // /portal/invoices/<id> has always worked while /portal/invoices itself
    // 404d, so anybody who bookmarked the parent got a broken product.
    const response = await page.goto("http://localhost:3100/portal/invoices", { waitUntil: "commit" });
    expect(response?.status()).toBeLessThan(400);
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
