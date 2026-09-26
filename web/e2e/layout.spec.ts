import { expect, test } from "@playwright/test";

for (const path of ["/", "/en", "/pdf-imzala", "/en/organize-pdf"]) {
  test(`no horizontal overflow on ${path} @mobile`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("language switch keeps the current tool @mobile", async ({ page }) => {
  await page.goto("/pdf-birlestir");
  await page.getByRole("link", { name: /English/ }).click();
  await expect(page).toHaveURL(/\/en\/merge-pdf$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
