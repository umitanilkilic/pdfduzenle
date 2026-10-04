import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { expect, test } from "./base";
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
    // The whole page fits its box (a portrait page is taller than wide, not cropped to a square).
    const box = (await thumb.boundingBox())!;
    const frame = (await thumb.locator("..").boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(frame.height);
    expect(box.width).toBeLessThan(box.height);
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

test("single-file tools show every page, and fall back to the file row when pdf.js can't open it", async ({ page }) => {
  await page.goto("/pdf-bol");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(3, "rapor.pdf"));
  await expect(page.getByText("rapor.pdf")).toBeVisible();
  await expect(page.getByTestId("page-grid").getByRole("img")).toHaveCount(3);

  await page.goto("/pdf-sifre-kaldir");
  await page.getByTestId("file-input").setInputFiles("src/pdf/testdata/encrypted-aes256.pdf");
  await expect(page.getByText("encrypted-aes256.pdf")).toBeVisible();
  await expect(page.getByText("Sayfalar yükleniyor…")).toHaveCount(0);
  await expect(page.getByTestId("page-grid")).toHaveCount(0);
  // Next.js' route announcer is an empty alert; only real messages count.
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
});

test("Markdown to PDF: live preview follows the options and the result keeps the title @mobile", async ({ page }) => {
  const markdown = [
    "# Notlar",
    "",
    ...Array.from({ length: 70 }, (_, i) => `${i + 1}. paragraf: **kalın** ve \`kod\`.\n`),
  ];
  await page.goto("/markdown-pdf-cevir");
  await page
    .getByTestId("file-input")
    .setInputFiles({ name: "notlar.md", mimeType: "text/markdown", buffer: Buffer.from(markdown.join("\n")) });

  const summary = page.getByTestId("markdown-preview").getByText(/^Önizleme: \d+ sayfa$/);
  await expect(summary).toBeVisible();
  const pagesAt = async () => Number((await summary.textContent())?.match(/\d+/)?.[0]);
  const normal = await pagesAt();
  await page.getByText("Büyük", { exact: true }).click();
  await expect.poll(pagesAt).toBeGreaterThan(normal);

  const download = await startAndDownload(page);
  expect(download.suggestedFilename()).toBe("notlar-markdown.pdf");
  const doc = await PDFDocument.load(await readFile(await download.path()));
  expect(doc.getTitle()).toBe("Notlar");
  expect(doc.getPageCount()).toBeGreaterThan(normal);
});
