import { test, expect } from "@playwright/test";

const id = (n: number) => `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`;
const rooms = [
  { name: "Customer", port: 3104, routes: ["/", "/scope", "/milestones", "/previews", "/files", "/billing", "/support", "/people", "/organisation"] },
  { name: "Admin", port: 3101, routes: ["/", "/requests", `/requests/${id(40)}`, "/enquiries", `/enquiries/${id(41)}`, "/pipeline", "/projects", `/projects/${id(20)}`, "/people", ...[2, 3, 4, 5].map(n => `/people/${id(n)}`), "/people/invite/staff", "/people/invite/intern", "/people/invite/client", "/grants", "/learning", "/completions", "/certificates", "/compensation", "/audit", "/analytics", "/settings"] },
  { name: "Employee", port: 3102, routes: ["/", "/projects", `/projects/${id(20)}`, "/tasks", "/mentoring", "/compensation", "/documents", "/profile"] },
  { name: "Intern", port: 3103, routes: ["/", "/internship", "/project", "/tasks", "/log", "/learning", "/certificate", "/profile", "/help", "/verify/SAMPLE-LOCAL-001"] },
];

for (const room of rooms) {
  test(`${room.name}: one-click entry and safe return path`, async ({ page }) => {
    const external: string[] = [];
    page.on("request", request => { if (/supabase\.(co|com)|firebase|accounts\.google|identitytoolkit/.test(request.url())) external.push(request.url()); });
    await page.goto(`http://localhost:${room.port}/login?next=${encodeURIComponent(room.routes[1])}`);
    await expect(page.getByRole("complementary", { name: "Local preview" })).toBeVisible();
    await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(`http://localhost:${room.port}${room.routes[1]}`);
    await expect(page.locator("h1")).toHaveCount(1);
    await page.goto(`http://localhost:${room.port}/login?next=https://example.com`);
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/");
    expect(external).toEqual([]);
  });

  for (const route of room.routes) {
    test(`${room.name}: ${route} renders sample data without layout overflow`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      const response = await page.goto(`http://localhost:${room.port}${route}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("complementary", { name: "Local preview" })).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("body")).not.toContainText("Application error");
      await expect(page.locator('input[type="password"]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (route === "/" || route === "/organisation") await page.screenshot({ path: info.outputPath("workspace.png"), fullPage: true });
      expect(errors).toEqual([]);
    });
  }
}

test("Customer request persists and opens in the admin workspace", async ({ page }, info) => {
  const title = `Sample QA request ${info.project.name} ${Date.now()}`;
  await page.goto("http://localhost:3104/support");
  await page.getByLabel("In one line").fill(title);
  await page.getByLabel("What is happening, or what you need").fill("Local sample request created to verify the customer-to-admin review journey.");
  await page.getByRole("button", { name: "Send to the studio", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved to the local admin workspace");
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.goto("http://localhost:3101/requests");
  await page.getByRole("link").filter({ hasText: title }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  // The status caption is a sibling in the custom cluster, so target the
  // single native select rather than relying on an implicit label association.
  const status = page.locator("select").first();
  await status.selectOption("reviewing");
  await expect(status).toHaveValue("reviewing");
  await page.reload();
  await expect(page.locator("select").first()).toHaveValue("reviewing");
});

test("Profile edit survives refresh; avatar stays local", async ({ page }, info) => {
  // One project owns this shared mutation to avoid two browsers editing one sample profile.
  test.skip(info.project.name !== "desktop", "Shared sample account edited once");
  await page.goto("http://localhost:3104/organisation");
  const name = page.getByLabel("Full name", { exact: true });
  const original = await name.inputValue();
  await name.fill("Customer preview edit");
  await page.getByLabel("Phone", { exact: true }).fill("+91 9000000000");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==", "base64");
  await page.locator("#profile-avatar").setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");
  await page.reload();
  await expect(name).toHaveValue("Customer preview edit");
  const avatar = page.locator(".profile-avatar-editor img");
  await expect(avatar).toHaveAttribute("src", /^\/api\/preview\?/);
  expect(await avatar.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(256);
  await name.fill(original);
  await page.getByLabel("Phone", { exact: true }).fill("");
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");
});

test("Credential routes return to one-click entry", async ({ request }) => {
  for (const room of rooms) for (const route of ["/forgot-password", "/reset-password", "/accept-invite", "/account/password"]) {
    const response = await request.get(`http://localhost:${room.port}${route}`, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/login");
  }
  for (const route of ["/signup", "/onboarding"]) {
    const response = await request.get(`http://localhost:3104${route}`, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
  }
});

test("Preview rejects cross-origin writes and cannot send invitations", async ({ request }) => {
  const endpoint = "http://localhost:3101/api/preview";
  const blocked = await request.post(endpoint, { headers: { origin: "https://example.com" }, data: { table: "profiles", action: "delete" } });
  expect(blocked.status()).toBe(403);
  const invite = await request.post(endpoint, { headers: { origin: "http://localhost:3101" }, data: { rpc: "create_invitation", args: { email: "nobody@example.test" } } });
  expect((await invite.json()).error.message).toContain("No email or invitation has been sent");
});

test("Public preview links stay local and analytics are disconnected", async ({ page, request }) => {
  const external: string[] = [];
  page.on("request", request => { if (/supabase|googletagmanager|google-analytics/.test(request.url())) external.push(request.url()); });
  await page.goto("http://localhost:8123/contact");
  const links = await page.locator('a[href*="localhost:3104"]').count();
  expect(links).toBeGreaterThan(0);
  expect(await page.locator('a[href*="client.mucolabs.com"]').count()).toBe(0);
  expect(external).toEqual([]);
  const delivery = await request.post("http://localhost:8123/api/lead", { data: { name: "sample" } });
  expect(delivery.status()).toBe(409);
});

test("All workspace navigation fits a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  for (const room of rooms) {
    await page.goto(`http://localhost:${room.port}/`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.getByRole("navigation", { name: "Switch preview workspace" })).toBeVisible();
  }
});
