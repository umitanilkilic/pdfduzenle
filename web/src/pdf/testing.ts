import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream, degrees } from "pdf-lib";

/**
 * Test helper: builds a PDF whose page i is (100 + i) points wide, so page order can be checked
 * after an operation by reading the widths back.
 */
export async function makePdf(pageCount: number, opts: { rotation?: number } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([100 + i, 200]);
    if (opts.rotation) page.setRotation(degrees(opts.rotation));
  }
  return doc.save();
}

/** Reads back the page identifiers written by `makePdf`. */
export async function pageIds(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => Math.round(p.getMediaBox().width) - 100);
}

export async function pageRotations(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => p.getRotation().angle);
}

export function testFont(): Uint8Array {
  return readFileSync(join(process.cwd(), "public/fonts/Inter-400.ttf"));
}

/** A valid 1×1 PNG. */
export const PNG_1X1 = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);

/** Decoded content-stream operators of a page, for asserting where things were drawn. */
export async function pageContent(bytes: Uint8Array, pageIndex: number): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  const contents = doc.getPage(pageIndex).node.Contents();
  const streams =
    contents instanceof PDFArray
      ? contents.asArray().map((ref) => doc.context.lookup(ref))
      : contents
        ? [contents]
        : [];
  return streams.map((s) => new TextDecoder().decode(decodePDFRawStream(s as PDFRawStream).decode())).join("\n");
}

/** Translation (e, f) of every text matrix (`Tm`) or image placement (`cm`) in a page. */
export async function drawOrigins(bytes: Uint8Array, pageIndex: number, op: "Tm" | "cm"): Promise<number[][]> {
  const content = await pageContent(bytes, pageIndex);
  const re = new RegExp(`(-?[\\d.]+) (-?[\\d.]+) (-?[\\d.]+) (-?[\\d.]+) (-?[\\d.]+) (-?[\\d.]+) ${op}`, "g");
  return [...content.matchAll(re)].map((m) => m.slice(1).map(Number));
}
