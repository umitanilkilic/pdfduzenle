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

test("the start button stays on screen on phones @mobile", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout only");
  await page.goto("/pdf-sayfa-duzenle");
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  for (let i = 0; i < 8; i++) doc.addPage([595, 842]);
  await page
    .getByTestId("file-input")
    .setInputFiles({ name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) });
  await expect(page.getByTestId("start")).toBeInViewport();
});

test("pages run without Content-Security-Policy violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text());
  });
  const res = await page.goto("/pdf-imzala");
  expect(res?.headers()["content-security-policy"]).toContain("default-src 'self'");

  // Exercises the pdf.js worker, blob previews, the Caveat font and the PDF engine worker.
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.addPage([300, 400]);
  await page
    .getByTestId("file-input")
    .setInputFiles({ name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) });
  await page.getByText("Yaz", { exact: true }).click();
  await page.getByPlaceholder("Adınız Soyadınız").fill("Ümit");
  await expect(page.getByTestId("signature-box")).toBeVisible();
  await page.getByTestId("start").click();
  await expect(page.getByText("Hazır!")).toBeVisible();
  expect(violations).toEqual([]);
});
