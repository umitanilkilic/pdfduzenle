import { expect, test } from "@playwright/test";
import { pageIdsOf, samplePdf, startAndDownload } from "./helpers";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (err) => {
    throw err;
  });
});

test("merge PDF files in the chosen order @mobile", async ({ page }) => {
  await page.goto("/pdf-birlestir");
  await page.getByTestId("file-input").setInputFiles([await samplePdf(2, "a.pdf"), await samplePdf(1, "b.pdf")]);
  await expect(page.getByText("a.pdf")).toBeVisible();
  const download = await startAndDownload(page);
  expect(download.suggestedFilename()).toBe("a-birlestirilmis.pdf");
  expect(await pageIdsOf(download)).toEqual([0, 1, 0]);
});

test("remove pages by clicking thumbnails", async ({ page }) => {
  await page.goto("/pdf-sayfa-sil");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(4));
  await page.getByRole("button", { name: "Sayfa 2", exact: true }).click();
  await page.getByRole("button", { name: "Sayfa 4", exact: true }).click();
  await expect(page.getByLabel("Sayfalar")).toHaveValue("2, 4");
  const download = await startAndDownload(page);
  expect(await pageIdsOf(download)).toEqual([0, 2]);
});

test("split every page into a ZIP", async ({ page }) => {
  await page.goto("/en/split-pdf");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(3));
  await page.getByText("Every page as a separate file").click();
  await page.getByTestId("start").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all (ZIP)" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("split-pdf.zip");
});

test("shows a translated error for an invalid range", async ({ page }) => {
  await page.goto("/pdf-bol");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(2));
  await page.getByLabel("Sayfalar").fill("5");
  await page.getByTestId("start").click();
  await expect(page.getByRole("alert").filter({ hasText: "Belgede olmayan bir sayfa numarası" })).toBeVisible();
});

test("organize: rotate and delete pages", async ({ page }) => {
  await page.goto("/pdf-sayfa-duzenle");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(3));
  await page.getByRole("button", { name: "Sil" }).first().click();
  await page.getByRole("button", { name: "Sağa döndür" }).nth(1).click();
  const download = await startAndDownload(page);
  expect(await pageIdsOf(download)).toEqual([1, 2]);
});

test("add page numbers and a watermark with a live preview", async ({ page }) => {
  await page.goto("/pdf-sayfa-numarasi-ekle");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(2));
  const overlay = page.getByTestId("preview-overlay");
  await expect(overlay).toHaveText("1");
  await page.getByText("1 / 12", { exact: true }).click();
  await page.getByLabel("İlk sayfayı (kapak) numaralandırma").check();
  await expect(overlay).toHaveText("1 / 1");
  await expect(page.getByText("Önizleme: 2. sayfa")).toBeVisible();
  expect(await pageIdsOf(await startAndDownload(page))).toEqual([0, 1]);

  await page.goto("/pdf-filigran-ekle");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(1));
  await expect(page.getByTestId("preview-overlay")).toHaveText("GİZLİDİR");
  await page.getByLabel("Filigran metni").fill("TASLAK");
  await expect(page.getByTestId("preview-overlay")).toHaveText("TASLAK");
  expect(await pageIdsOf(await startAndDownload(page))).toEqual([0]);
});

test("file lists show a preview of each PDF", async ({ page }) => {
  await page.goto("/pdf-birlestir");
  await page.getByTestId("file-input").setInputFiles([await samplePdf(2, "a.pdf"), await samplePdf(1, "b.pdf")]);
  const thumbs = page.getByTestId("file-thumb");
  await expect(thumbs).toHaveCount(2);
  for (const thumb of await thumbs.all()) {
    await expect(thumb).toHaveJSProperty("complete", true);
    expect(await thumb.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
});

test("PDF to JPG renders every page", async ({ page }) => {
  await page.goto("/pdf-jpg-cevir");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(2));
  await page.getByTestId("start").click();
  await expect(page.getByText("ornek-sayfa-1.jpg")).toBeVisible();
  await expect(page.getByText("ornek-sayfa-2.jpg")).toBeVisible();
});

test("sign: draw a signature and place it", async ({ page }) => {
  await page.goto("/pdf-imzala");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(1));
  const pad = page.locator("canvas").first();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 80, { steps: 8 });
  await page.mouse.move(box.x + 200, box.y + 30, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId("signature-box")).toBeVisible();
  expect(await pageIdsOf(await startAndDownload(page))).toEqual([0]);
});

test("sign: type a signature with Turkish characters", async ({ page }) => {
  await page.goto("/pdf-imzala");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(2));
  await page.getByText("Yaz", { exact: true }).click();
  await page.getByPlaceholder("Adınız Soyadınız").fill("Ümit Anıl Kılıç");
  await expect(page.getByTestId("signature-box")).toBeVisible();
  await page.getByLabel("Tüm sayfalara ekle").check();
  expect(await pageIdsOf(await startAndDownload(page))).toEqual([0, 1]);
});

test("JPG to PDF", async ({ page }) => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.goto("/jpg-pdf-cevir");
  await page.getByTestId("file-input").setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: png },
    { name: "b.png", mimeType: "image/png", buffer: png },
  ]);
  const download = await startAndDownload(page);
  expect((await pageIdsOf(download)).length).toBe(2);
});
