import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { samplePdf, startAndDownload } from "./helpers";

test("compress shows the size reduction @server", async ({ page }) => {
  const fixture = await readFile("../services/gateway/internal/tools/testdata/sample.pdf");
  await page.goto("/pdf-sikistir");
  await page
    .getByTestId("file-input")
    .setInputFiles({ name: "buyuk.pdf", mimeType: "application/pdf", buffer: fixture });
  await page.getByTestId("start").click();
  await expect(page.getByTestId("savings")).toContainText("daha küçük", { timeout: 30_000 });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "İndir", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("buyuk-sikistirilmis.pdf");
  expect((await readFile(await file.path())).byteLength).toBeLessThan(fixture.byteLength);
});

test("protect then unlock with the right and wrong password @server", async ({ page }) => {
  await page.goto("/pdf-sifrele");
  await page.getByTestId("file-input").setInputFiles(await samplePdf(1, "gizli.pdf"));
  await page.getByLabel("Şifre", { exact: true }).fill("Güçlü-123");
  await page.getByLabel("Şifre (tekrar)").fill("farkli");
  await page.getByTestId("start").click();
  await expect(page.getByRole("alert").filter({ hasText: "Şifreler eşleşmiyor" })).toBeVisible();
  await page.getByLabel("Şifre (tekrar)").fill("Güçlü-123");
  const locked = await readFile(await (await startAndDownload(page)).path());
  await expect(PDFDocument.load(locked)).rejects.toThrow(/encrypted/i);

  await page.goto("/pdf-sifre-kaldir");
  const input = { name: "gizli.pdf", mimeType: "application/pdf", buffer: locked };
  await page.getByTestId("file-input").setInputFiles(input);
  await page.getByLabel("Mevcut şifre").fill("yanlis");
  await page.getByTestId("start").click();
  await expect(page.getByRole("alert").filter({ hasText: "Şifre yanlış" })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Mevcut şifre").fill("Güçlü-123");
  const unlocked = await readFile(await (await startAndDownload(page)).path());
  expect((await PDFDocument.load(unlocked)).getPageCount()).toBe(1);
});

test("Word to PDF with LibreOffice @server", async ({ page }) => {
  await page.goto("/en/word-to-pdf");
  await page.getByTestId("file-input").setInputFiles({
    name: "notlar.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("PDF Düzenle – Türkçe karakterler: ğüşıöç"),
  });
  const download = await startAndDownload(page);
  expect(download.suggestedFilename()).toBe("notlar-pdf.pdf");
  expect((await PDFDocument.load(await readFile(await download.path()))).getPageCount()).toBeGreaterThan(0);
});

test("rejects a fake PDF with a translated message @server", async ({ page }) => {
  await page.goto("/pdf-onar");
  await page
    .getByTestId("file-input")
    .setInputFiles({ name: "sahte.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a pdf") });
  await page.getByTestId("start").click();
  await expect(page.getByRole("alert").filter({ hasText: "geçerli bir PDF değil" })).toBeVisible();
});

test("uploads larger than 10 MB pass through the /api rewrite @server", async ({ page }) => {
  const fixture = await readFile("../services/gateway/internal/tools/testdata/sample.pdf");
  // Valid PDF followed by 12 MB of padding: repair must receive the whole body.
  const buffer = Buffer.concat([fixture, Buffer.alloc(12 * 1024 * 1024, 0x20)]);
  await page.goto("/pdf-onar");
  await page.getByTestId("file-input").setInputFiles({ name: "buyuk.pdf", mimeType: "application/pdf", buffer });
  const download = await startAndDownload(page);
  expect((await PDFDocument.load(await readFile(await download.path()))).getPageCount()).toBe(2);
});
