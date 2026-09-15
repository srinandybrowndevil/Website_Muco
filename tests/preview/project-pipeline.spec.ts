import { test, expect } from "@playwright/test";

const admin = "http://localhost:3101";
const customer = "http://localhost:3104";
const org = "11111111-1111-4111-8111-000000000001";

test("project brief reaches admin, converts once, and its lead can be updated", async ({ page }, info) => {
  const title = `Project brief ${info.project.name} ${Date.now()}`;
  await page.goto(`${customer}/start-project`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start a project");
  await page.getByLabel("In one line").fill(title);
  await page.getByLabel("What is happening, or what you need").fill("An online catalogue for a sample business. Local QA only.");
  await page.getByLabel("Features and requirements").fill("Search products and request a quote.");
  await page.getByLabel("When you need it").fill("Discuss after scope review");
  await page.getByRole("button", { name: "Send project brief", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved to the local admin workspace");
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.goto(`${admin}/requests`);
  await page.getByRole("link").filter({ hasText: title }).click();
  await page.waitForURL(/\/requests\/[\da-f-]+$/, { timeout: 60_000 });
  await expect(page.getByText("Search products and request a quote.", { exact: true })).toBeVisible();
  await page.getByLabel("Status", { exact: true }).selectOption("accepted");
  await page.getByRole("button", { name: "Create the lead and project" }).click();
  await expect(page.getByText("Already converted", { exact: true })).toBeVisible();
  const requestUrl = page.url();
  await page.getByRole("link", { name: "Open the project", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("main")).toContainText("Planning");
  await page.goto(requestUrl);
  await expect(page.getByRole("button", { name: "Create the lead and project" })).toHaveCount(0);
  await page.getByRole("link", { name: "Open the lead", exact: true }).click();
  await page.getByLabel("Sales stage").selectOption("qualified");
  await page.getByLabel("Estimated value (INR)").fill("25000.50");
  await page.getByLabel("Last contact date").fill("2026-09-14");
  await page.getByRole("button", { name: "Save lead", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Lead updated");
  await page.reload();
  await expect(page.getByLabel("Sales stage")).toHaveValue("qualified");
  await expect(page.getByLabel("Estimated value (INR)")).toHaveValue("25000.5");
  await page.goto(customer);
  await expect(page.getByText(title, { exact: true })).toBeVisible();
});

test("lost submission response preserves the brief and retry does not duplicate it", async ({ page }) => {
  const title = `Retry brief ${Date.now()}`;
  let savedId = "";
  await page.goto(`${customer}/start-project`);
  await page.route("**/api/preview", async route => {
    const body = route.request().postDataJSON();
    if (body?.table === "project_requests" && body.action === "insert" && !savedId) {
      savedId = body.values.id;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByLabel("In one line").fill(title);
  await page.getByLabel("What is happening, or what you need").fill("Local QA lost response recovery.");
  await page.getByRole("button", { name: "Send project brief", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("could not confirm");
  await expect(page.getByLabel("In one line")).toHaveValue(title);
  await page.getByRole("button", { name: "Send project brief", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(savedId);
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toHaveCount(1);
});

test("pipeline save failure allows retry without losing changes", async ({ page, request }) => {
  const response = await request.post(`${admin}/api/preview`, { headers: { origin: admin }, data: {
    table: "leads", action: "insert", values: { organization_id: org, name: "Sample recovery lead", stage: "new", estimated_value: 0 }, columns: "id", single: true,
  } });
  const lead = (await response.json()).data;
  await page.goto(`${admin}/pipeline/${lead.id}`);
  await page.getByLabel("Sales stage").selectOption("proposal");
  await page.route("**/api/preview", route => route.abort("failed"));
  await page.getByRole("button", { name: "Save lead", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("could not be saved");
  await expect(page.getByLabel("Sales stage")).toHaveValue("proposal");
  await page.unroute("**/api/preview");
  await page.getByRole("button", { name: "Save lead", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Lead updated");
});

test("new project page and lead details fit small mobile, tablet and desktop", async ({ page, request }, info) => {
  const response = await request.post(`${admin}/api/preview`, { headers: { origin: admin }, data: {
    table: "leads", action: "insert", values: { organization_id: org, name: "Sample layout lead", stage: "new", estimated_value: 0 }, columns: "id", single: true,
  } });
  const lead = (await response.json()).data;
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of [`${customer}/start-project`, `${admin}/pipeline`, `${admin}/pipeline/${lead.id}`]) {
      await page.goto(url);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await page.goto(`${customer}/start-project`);
    await page.screenshot({ path: info.outputPath(`project-brief-${width}.png`), fullPage: true });
  }
});
