import { expect, test } from "@playwright/test";

test("Customer navigation exposes all destinations and closes with Escape or selection", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3104/organisation");
  const menu = page.getByRole("button", { name: /Browse workspace/ });
  const nav = page.getByRole("navigation", { name: "Your project", exact: true });
  await expect(nav).toBeHidden();
  await menu.click();
  await expect(nav.getByRole("link")).toHaveCount(9);
  await nav.getByRole("link", { name: "Profile", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.click();
  await nav.getByRole("link", { name: "Billing", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3104/billing");
  await expect(nav).toBeHidden();
  await page.getByRole("link", { name: "Edit your profile" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Profile & organisation");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Profile", exact: true })).toHaveAttribute("aria-current", "page");
});

test("Profile drafts can be discarded and failed saves keep the draft recoverable", async ({ page }) => {
  await page.goto("http://localhost:3104/organisation");
  const name = page.getByLabel("Full name", { exact: true });
  const original = await name.inputValue();
  const save = page.getByRole("button", { name: "Save changes", exact: true });
  const formError = page.locator("form").getByRole("alert");
  await expect(save).toBeDisabled();
  await name.fill("Unsaved sample draft");
  await expect(page.getByRole("status")).toContainText("unsaved changes");
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(name).toHaveValue(original);
  await expect(save).toBeDisabled();

  await name.fill("   ");
  await save.click();
  await expect(formError).toContainText("Enter your full name");
  await page.getByRole("button", { name: "Discard changes" }).click();
  await name.fill("Recoverable sample draft");
  await page.route("**/api/preview", route => route.abort("failed"));
  await save.click();
  await expect(formError).toBeVisible();
  await expect(name).toHaveValue("Recoverable sample draft");
  await expect(save).toBeEnabled();
  await expect(page.getByRole("status")).not.toContainText("Profile saved");
  await page.unroute("**/api/preview");
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(name).toHaveValue(original);
});

test("Customer profile remains readable across compact, tablet and desktop themes", async ({ page }, info) => {
  for (const width of [320, 768, 1440]) {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme });
      await page.goto("http://localhost:3104/organisation");
      await expect(page.getByRole("heading", { name: "Your profile", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const upload = page.getByRole("button", { name: "Choose profile photo", exact: true });
      await expect(upload).toBeVisible();
      expect((await upload.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const input = page.getByLabel("Full name", { exact: true });
      expect((await input.boundingBox())!.width).toBeGreaterThan(160);
      await page.screenshot({ path: info.outputPath(`profile-${width}-${colorScheme}.png`), fullPage: true });
    }
  }
});
