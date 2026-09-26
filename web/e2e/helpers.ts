import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

/** A PDF whose page i is (100 + i) points wide, so page order can be verified. */
export async function samplePdf(pages: number, name = "ornek.pdf") {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([100 + i, 200]).drawText(`${i + 1}`, { x: 20, y: 100, size: 40 });
  return { name, mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) };
}

export async function pageIdsOf(download: Download): Promise<number[]> {
  const doc = await PDFDocument.load(await readFile(await download.path()));
  return doc.getPages().map((p) => Math.round(p.getWidth()) - 100);
}

export async function startAndDownload(page: Page): Promise<Download> {
  await page.getByTestId("start").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /^(İndir|Download)$/ }).click();
  return downloadPromise;
}
