import { readFileSync } from "node:fs";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { FONT_FILES, type FontFace } from "./fonts";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream, degrees } from "pdf-lib";

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

export function testFont(face: FontFace = "regular"): Uint8Array {
  return readFileSync(join(process.cwd(), "public/fonts", FONT_FILES[face]));
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

/**
 * For every glyph shown with `Tj` on a page in an embedded TrueType (Type0/Identity-H) font: whether the
 * embedded font program actually has an outline for it. A broken font subset renders as blank glyphs even
 * though text extraction still finds the characters.
 */
export async function drawnGlyphOutlines(bytes: Uint8Array, pageIndex: number): Promise<boolean[]> {
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(pageIndex);
  const fonts = page.node.Resources()?.lookupMaybe(PDFName.of("Font"), PDFDict);
  const programs = new Map<string, ReturnType<typeof fontkit.create>>();
  for (const [name, ref] of fonts?.entries() ?? []) {
    const type0 = doc.context.lookup(ref, PDFDict);
    const cid = type0.lookupMaybe(PDFName.of("DescendantFonts"), PDFArray)?.lookup(0, PDFDict);
    const descriptor = cid?.lookupMaybe(PDFName.of("FontDescriptor"), PDFDict);
    const file = descriptor?.lookup(PDFName.of("FontFile2"));
    if (file instanceof PDFRawStream)
      programs.set(name.asString(), fontkit.create(Buffer.from(decodePDFRawStream(file).decode())));
  }

  const content = await pageContent(bytes, pageIndex);
  const result: boolean[] = [];
  for (const [, fontName, hex] of content.matchAll(/(\/\S+) [\d.]+ Tf[\s\S]*?<([0-9a-fA-F]+)> Tj/g)) {
    const font = programs.get(fontName);
    if (!font) continue;
    for (let i = 0; i < hex.length; i += 4) {
      result.push(hasOutline(font, parseInt(hex.slice(i, i + 4), 16)));
    }
  }
  return result;
}

function hasOutline(font: ReturnType<typeof fontkit.create>, glyphId: number): boolean {
  try {
    const { bbox } = font.getGlyph(glyphId).path;
    return bbox.maxX > bbox.minX && bbox.maxY > bbox.minY;
  } catch {
    // Truncated or corrupt glyph data: the viewer can't draw it either.
    return false;
  }
}
