import { expect, test } from "./base";

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

test("file names are shown as text, never run as HTML", async ({ page }) => {
  let dialogs = 0;
  page.on("dialog", async (d) => {
    dialogs++;
    await d.dismiss();
  });
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.addPage();
  const name = '<img src=x onerror=alert(1)>"><script>alert(2)</script>.pdf';
  await page.goto("/pdf-dondur");
  await page
    .getByTestId("file-input")
    .setInputFiles({ name, mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) });
  await expect(page.getByText("<img src=x onerror=alert(1)>", { exact: false })).toBeVisible();
  await page.getByTestId("start").click();
  await page.getByRole("button", { name: "Son işlemler" }).click();
  await expect(page.getByRole("dialog", { name: "Son işlemler" })).toBeVisible();
  expect(dialogs).toBe(0);
  expect(await page.locator("script:not([src])", { hasText: "alert(2)" }).count()).toBe(0);
});

test("every page links its source code, as the AGPL requires", async ({ page }) => {
  for (const [path, text] of [
    ["/", "AGPL-3.0 lisanslı açık kaynak"],
    ["/en/merge-pdf", "Open source under AGPL-3.0"],
  ]) {
    await page.goto(path);
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: text })).toHaveAttribute(
      "href",
      "https://github.com/umitanilkilic/pdfduzenle",
    );
    await expect(footer.getByRole("link", { name: "GitHub" })).toBeVisible();
  }
});

test("llms.txt is served as plain text and links the tools", async ({ request }) => {
  const res = await request.get("/llms.txt");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/plain");
  const text = await res.text();
  expect(text).toMatch(/^# PDF Düzenle/);
  expect(text).toContain("https://pdfduzenle.tr/en/merge-pdf");
});
