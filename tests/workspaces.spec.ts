import { test, expect, type Page } from "@playwright/test";

// The four front doors, and what each one has to be.
//
// These run against four separate applications on four ports, which is the
// whole point: the previous suite could test the split by asking one server
// about four hostnames, and a split that one server can get wrong is not the
// split the founder asked for.
const DOORS = [
  { key: "admin", host: "admin.localhost:3101", accent: "rgb(168, 97, 58)", deep: "/audit" },
  { key: "employee", host: "employee.localhost:3102", accent: "rgb(91, 75, 196)", deep: "/compensation" },
  { key: "intern", host: "intern.localhost:3103", accent: "rgb(47, 125, 85)", deep: "/certificate" },
  { key: "client", host: "client.localhost:3104", accent: "rgb(44, 92, 138)", deep: "/billing" },
];

function consoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push("uncaught: " + error.message));
  return errors;
}

test.describe("four separate front doors", () => {
  for (const door of DOORS) {
    test(`${door.key} signs people in on its own address`, async ({ page }) => {
      const errors = consoleErrors(page);
      const response = await page.goto(`http://${door.host}/login`);
      expect(response?.status(), `${door.key} /login status`).toBeLessThan(400);

      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
      expect(page.url(), "stays on its own host").toContain(door.host);
      expect(errors, `${door.key} console errors`).toEqual([]);
    });

    test(`${door.key} paints its own accent on a real control`, async ({ page }) => {
      await page.goto(`http://${door.host}/login`);

      // On the button, not on a token. The last time this codebase themed four
      // workspaces the accent reached the glow and left every button copper,
      // and a token assertion would have passed.
      const button = page.locator("form button.primary").first();
      await expect(button).toBeVisible();
      const background = await button.evaluate(el => getComputedStyle(el).backgroundColor);
      expect(background, `${door.key} primary button colour`).toBe(door.accent);
    });

    test(`${door.key} keeps a deep link through sign-in`, async ({ page }) => {
      // Signing in must not lose where somebody was going, and must not send
      // them to a different workspace's address to do it.
      await page.goto(`http://${door.host}${door.deep}`, { waitUntil: "commit" });
      await page.waitForURL(/\/login/);
      const url = page.url();
      expect(url, `${door.key} should stay on its own address`).toContain(door.host);
      expect(url, `${door.key} should remember the destination`)
        .toContain("next=" + encodeURIComponent(door.deep));
    });

    test(`${door.key} asks crawlers to stay out`, async ({ request }) => {
      // Three layers, and this checks two of them. robots.txt has to be
      // reachable without a session -- when it was not, every one of these
      // hosts answered a crawler with a redirect to /login, which reads as
      // "no robots.txt at all".
      const robots = await request.get(`http://${door.host}/robots.txt`, { maxRedirects: 0 });
      expect(robots.status(), `${door.key} robots.txt must not redirect`).toBe(200);
      const body = await robots.text();
      expect(body).toContain("Disallow: /");
      expect(body).not.toContain("<html");

      const page = await request.get(`http://${door.host}/login`);
      expect(page.headers()["x-robots-tag"]).toContain("noindex");
    });

    test(`${door.key} sets the security headers`, async ({ request }) => {
      const response = await request.get(`http://${door.host}/login`);
      const headers = response.headers();
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(headers["content-security-policy"]).toContain("object-src 'none'");
    });
  }
});

test.describe("the address that was retired", () => {
  test("portal redirects to client, keeping the path", async ({ request }) => {
    // portal.mucolabs.com is in several hundred published links. Removing the
    // workspace is a decision; breaking the links is not part of it.
    const response = await request.get("http://portal.localhost:3104/billing", { maxRedirects: 0 });
    expect(response.status(), "must be a permanent redirect").toBe(308);
    expect(response.headers()["location"]).toContain("client.localhost:3104");
    expect(response.headers()["location"]).toContain("/billing");
  });
});

test.describe("an account that has been switched off", () => {
  // The rule itself is enforced in the database and proved there. What these
  // check is the part a person meets: being told what happened rather than
  // being bounced to a form.
  for (const door of DOORS) {
    test(`${door.key} explains it rather than offering a way back in`, async ({ page }) => {
      await page.goto(`http://${door.host}/login?access=closed`);
      await expect(page.getByText(/switched off/i)).toBeVisible();
      expect(page.url(), "stays on the address it was asked on").toContain(door.host);
    });
  }

  test("an ordinary sign-in page says nothing of the kind", async ({ page }) => {
    // Guards against the notice being pinned open, which would tell every
    // visitor their account had been revoked.
    await page.goto("http://admin.localhost:3101/login");
    await expect(page.getByText(/switched off/i)).toHaveCount(0);
  });
});

test.describe("certificate verification is public", () => {
  test("an unknown serial is answered without a session", async ({ page }) => {
    // An employer checking a certificate has no account here. A verification
    // page that demands one verifies nothing.
    const response = await page.goto("http://intern.localhost:3103/verify/MUCO-INT-2026-9999");
    expect(response?.status()).toBeLessThan(400);
    expect(page.url(), "must not bounce to sign-in").not.toContain("/login");
    await expect(page.getByText(/no certificate with that serial/i)).toBeVisible();
  });
});

test.describe("public pages render", () => {
  for (const door of DOORS) {
    for (const path of ["/login", "/forgot-password", "/reset-password"]) {
      test(`${door.key}${path}`, async ({ page }) => {
        const errors = consoleErrors(page);
        const response = await page.goto(`http://${door.host}${path}`);
        expect(response?.status()).toBeLessThan(400);
        await expect(page.locator("h1").first()).toBeVisible();

        // No sideways scroll, which on a phone is the difference between
        // usable and not.
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth > doc.clientWidth + 1
            ? { page: doc.scrollWidth, viewport: doc.clientWidth }
            : null;
        });
        expect(overflow, `${door.key}${path} scrolls horizontally`).toBeNull();
        expect(errors, `${door.key}${path} console errors`).toEqual([]);
      });
    }
  }
});
