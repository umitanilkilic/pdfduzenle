import type { Page } from "@playwright/test";
import { expect, test } from "./base";
import { samplePdf } from "./helpers";

// Built with test IDs (npm run build:e2e); the third-party hosts are stubbed in base.ts.
test.use({ consent: null });

/** gtag calls pushed so far, as plain arrays. */
function dataLayer(page: Page) {
  return page.evaluate(() =>
    ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).map((a) => Array.from(a)),
  );
}

function consentCalls(calls: unknown[][], kind: "default" | "update") {
  return calls.filter((c) => c[0] === "consent" && c[1] === kind).map((c) => c[2] as Record<string, string>);
}

test("Consent Mode starts denied; rejecting keeps Clarity off and is remembered @mobile", async ({ page }) => {
  const clarityRequests: string[] = [];
  page.on("request", (r) => r.url().includes("clarity.ms") && clarityRequests.push(r.url()));

  await page.goto("/");
  const banner = page.getByTestId("consent-banner");
  await expect(banner).toBeVisible();
  expect(consentCalls(await dataLayer(page), "default")).toEqual([
    { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" },
  ]);

  await banner.getByRole("button", { name: "Reddet" }).click();
  await expect(banner).toBeHidden();
  expect(consentCalls(await dataLayer(page), "update").at(-1)).toMatchObject({ analytics_storage: "denied" });

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(banner).toBeHidden();
  expect(clarityRequests).toEqual([]);
});

test("accepting grants analytics storage, loads Clarity and can be changed from the footer", async ({ page }) => {
  await page.goto("/en");
  const banner = page.getByTestId("consent-banner");
  const clarity = page.waitForRequest(/clarity\.ms\/tag\/e2etest000/);
  await banner.getByRole("button", { name: "Accept" }).click();
  await clarity;
  expect(consentCalls(await dataLayer(page), "update").at(-1)).toMatchObject({
    analytics_storage: "granted",
    ad_storage: "denied",
  });

  // The saved grant applies from the first gtag call of the next page view.
  await page.reload();
  expect(consentCalls(await dataLayer(page), "default")[0]).toMatchObject({ analytics_storage: "granted" });

  await page.getByRole("contentinfo").getByRole("button", { name: "Cookie settings" }).click();
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("link", { name: "Details" })).toHaveAttribute("href", "/en/privacy");
});

test("tool events carry IDs and counts, never file names; tool areas are masked for Clarity", async ({ page }) => {
  await page.goto("/pdf-birlestir");
  await page.getByTestId("consent-banner").getByRole("button", { name: "Reddet" }).click();
  await page
    .getByTestId("file-input")
    .setInputFiles([await samplePdf(1, "gizli-rapor.pdf"), await samplePdf(1, "maas-bordrosu.pdf")]);
  await page.getByTestId("start").click();
  await expect(page.getByTestId("result")).toBeVisible();

  const calls = await dataLayer(page);
  const events = calls.filter((c) => c[0] === "event");
  expect(events).toContainEqual(["event", "tool_start", { tool_id: "merge", file_count: 2 }]);
  expect(events).toContainEqual([
    "event",
    "tool_success",
    expect.objectContaining({ tool_id: "merge", output_count: 1 }),
  ]);
  const sent = JSON.stringify(calls);
  expect(sent).not.toContain("gizli-rapor");
  expect(sent).not.toContain("maas-bordrosu");

  await expect(page.locator("[data-clarity-mask]").getByTestId("result")).toBeVisible();
});

test("privacy page and search engine verification tags", async ({ page }) => {
  await page.goto("/gizlilik");
  await expect(page.getByRole("heading", { level: 1, name: "Gizlilik ve çerezler" })).toBeVisible();
  await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute("content", "e2e-google-token");
  await expect(page.locator('meta[name="msvalidate.01"]')).toHaveAttribute("content", "E2EBINGTOKEN");

  await page.goto("/en/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy and cookies" })).toBeVisible();
  await expect(page.locator('link[rel="alternate"][hreflang="tr-TR"]')).toHaveAttribute(
    "href",
    "https://pdfduzenle.tr/gizlilik",
  );
});
