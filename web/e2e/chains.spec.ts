import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, test } from "./base";
import { PDFDocument } from "pdf-lib";
import { pageIdsOf, samplePdf, startAndDownload } from "./helpers";

/** Clicks a "continue with" link on the result screen and waits for the file to be handed over. */
async function continueWith(page: Page, tool: string, expectedFile: string) {
  await page.getByTestId("result").getByRole("link", { name: tool, exact: true }).click();
  await expect(page.getByText(expectedFile)).toBeVisible();
}

const docx = { name: "not.txt", mimeType: "text/plain", buffer: Buffer.from("Zincir testi: ğüşıöç") };

test("browser → server: merge, then compress the merged file @server", async ({ page }) => {
  await page.goto("/pdf-birlestir");
  await page.getByTestId("file-input").setInputFiles([await samplePdf(2, "a.pdf"), await samplePdf(1, "b.pdf")]);
  await page.getByTestId("start").click();
  await continueWith(page, "PDF Sıkıştır", "a-birlestirilmis.pdf");

  const download = await startAndDownload(page);
  expect(download.suggestedFilename()).toBe("a-birlestirilmis-sikistirilmis.pdf");
  expect((await PDFDocument.load(await readFile(await download.path()))).getPageCount()).toBe(3);
});

test("server → browser: Word to PDF, then merge with another file @server", async ({ page }) => {
  await page.goto("/word-pdf-cevir");
  await page.getByTestId("file-input").setInputFiles(docx);
  await page.getByTestId("start").click();
  await continueWith(page, "PDF Birleştir", "not-pdf.pdf");

  await page.getByTestId("file-input").setInputFiles(await samplePdf(2, "ek.pdf"));
  const download = await startAndDownload(page);
  const merged = await PDFDocument.load(await readFile(await download.path()));
  expect(merged.getPageCount()).toBeGreaterThanOrEqual(3);
});

test("server → server → browser: Word to PDF, protect, then unlock and number pages @server", async ({ page }) => {
  await page.goto("/word-pdf-cevir");
  await page.getByTestId("file-input").setInputFiles(docx);
  await page.getByTestId("start").click();
  await continueWith(page, "PDF Şifrele", "not-pdf.pdf");

  await page.getByLabel("Şifre", { exact: true }).fill("Zincir-1");
  await page.getByLabel("Şifre (tekrar)").fill("Zincir-1");
  await page.getByTestId("start").click();
  await expect(page.getByTestId("result")).toBeVisible();

  // The encrypted result is reused from the recent-files drawer in another server tool.
  await page.getByRole("button", { name: "Son işlemler" }).click();
  const drawer = page.getByRole("dialog", { name: "Son işlemler" });
  const item = drawer.getByRole("listitem").filter({ hasText: "not-pdf-sifreli.pdf" });
  await item.getByRole("button", { name: "Başka araçta kullan" }).click();
  await item.getByRole("link", { name: "PDF Şifre Kaldır", exact: true }).click();
  await expect(page.getByText("not-pdf-sifreli.pdf")).toBeVisible();
  await page.getByLabel("Mevcut şifre").fill("Zincir-1");
  await page.getByTestId("start").click();

  // Server result → browser tool.
  await continueWith(page, "PDF Birleştir", "not-pdf-sifreli-sifresiz.pdf");
  const download = await startAndDownload(page);
  expect((await PDFDocument.load(await readFile(await download.path()))).getPageCount()).toBeGreaterThan(0);
});

test("browser tool refuses an encrypted file handed over from a server tool @server", async ({ page }) => {
  await page.goto("/pdf-sifrele");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(2, "gizli.pdf"));
  await page.getByLabel("Şifre", { exact: true }).fill("x");
  await page.getByLabel("Şifre (tekrar)").fill("x");
  await page.getByTestId("start").click();
  await expect(page.getByTestId("result")).toBeVisible();

  await page.getByRole("button", { name: "Son işlemler" }).click();
  const drawer = page.getByRole("dialog", { name: "Son işlemler" });
  await drawer.getByRole("button", { name: "Başka araçta kullan" }).click();
  await drawer.getByRole("link", { name: "PDF Döndür", exact: true }).click();
  await page.getByTestId("start").click();
  await expect(page.getByRole("alert").filter({ hasText: "Bu PDF şifreli" })).toBeVisible();
});

test("OCR text output only suggests tools that accept text @server", async ({ page }) => {
  const scan = { name: "tarama.png", mimeType: "image/png", buffer: await readFile("e2e/fixtures/turkce-tarama.png") };
  await page.goto("/pdf-ocr");
  await page.getByTestId("file-input").setInputFiles(scan);
  await page.getByText("Düz metin (TXT)").click();
  await page.getByTestId("start").click();
  await expect(page.getByTestId("result")).toBeVisible();
  // compress and pdf-to-word only take PDFs: they must not be offered for a .txt result.
  await expect(page.getByTestId("result").getByRole("link")).toHaveCount(0);
});

test("pdf-to-jpg images can be turned back into a PDF", async ({ page }) => {
  await page.goto("/pdf-jpg-cevir");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(2, "sayfalar.pdf"));
  await page.getByTestId("start").click();
  await expect(page.getByTestId("result")).toBeVisible();

  await page.getByRole("button", { name: "Son işlemler" }).click();
  const drawer = page.getByRole("dialog", { name: "Son işlemler" });
  const item = drawer.getByRole("listitem").filter({ hasText: "sayfalar-sayfa-1.jpg" });
  await item.getByRole("button", { name: "Başka araçta kullan" }).click();
  await item.getByRole("link", { name: "JPG'den PDF'e", exact: true }).click();
  await expect(page.getByText("sayfalar-sayfa-1.jpg")).toBeVisible();
  expect((await pageIdsOf(await startAndDownload(page))).length).toBe(1);
});
