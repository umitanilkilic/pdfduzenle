import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { PdfToolError } from "../errors";
import { FONT_FILES, type FontFace } from "../fonts";
import { drawnGlyphOutlines, testFont } from "../testing";
import { createFontMetrics, markdownToPdf, type MarkdownFonts, type MarkdownPdfOptions } from "./markdown";

const fonts = Object.fromEntries(
  (Object.keys(FONT_FILES) as FontFace[]).map((face) => [face, testFont(face)]),
) as MarkdownFonts;
const opts: MarkdownPdfOptions = { pageSize: "a4", fontSize: 11, margin: "normal" };

/** PostScript names of the fonts embedded in a PDF. */
async function embeddedFonts(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes);
  const names = new Set<string>();
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict && obj.get(PDFName.of("Type")) === PDFName.of("FontDescriptor")) {
      names.add(obj.get(PDFName.of("FontName"))!.toString().replace(/^\//, ""));
    }
  }
  return [...names].sort();
}

describe("markdownToPdf", () => {
  it("typesets a document with real outlines for Turkish text and sets the title", async () => {
    const out = await markdownToPdf("# Şirket Raporu\n\nİçerik: ğüşıöç **kalın** *eğik*", opts, fonts);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });
    expect(doc.getTitle()).toBe("Şirket Raporu");
    const outlines = await drawnGlyphOutlines(out, 0);
    expect(outlines.length).toBeGreaterThan(20);
    // Only spaces are blank: "Şirket Raporu" (1), "İçerik: ğüşıöç " (2), " " between runs (1).
    expect(outlines.filter((has) => !has).length).toBeLessThanOrEqual(5);
  });

  it("embeds only the faces the document uses", async () => {
    const plain = await embeddedFonts(await markdownToPdf("Sadece düz metin.", opts, fonts));
    expect(plain).toHaveLength(1);
    expect(plain[0]).toMatch(/Inter/);
    const rich = await embeddedFonts(await markdownToPdf("**a** *b* `c`", opts, fonts));
    expect(rich).toHaveLength(4);
    expect(rich.some((n) => /JetBrainsMono/.test(n))).toBe(true);
  });

  it("adds clickable links for http(s) only", async () => {
    const out = await markdownToPdf("[site](https://pdfduzenle.tr) [kötü](javascript:alert(1))", opts, fonts);
    const doc = await PDFDocument.load(out);
    const annots = doc.getPage(0).node.Annots();
    expect(annots).toBeInstanceOf(PDFArray);
    const uris = annots!.asArray().map((ref) => {
      const action = doc.context.lookup(ref, PDFDict).lookup(PDFName.of("A"), PDFDict);
      return action.lookup(PDFName.of("URI"), PDFString).decodeText();
    });
    expect(uris).toEqual(["https://pdfduzenle.tr/"]);
  });

  it("uses the chosen page size and flows long documents over several pages", async () => {
    const md = Array.from({ length: 120 }, (_, i) => `Paragraf ${i}: ${"metin ".repeat(20)}`).join("\n\n");
    const doc = await PDFDocument.load(await markdownToPdf(md, { ...opts, pageSize: "letter" }, fonts));
    expect(doc.getPageCount()).toBeGreaterThan(3);
    expect(doc.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  });

  it("rejects empty documents and oversized input", async () => {
    await expect(markdownToPdf("  \n\n<div></div>\n", opts, fonts)).rejects.toMatchObject({ code: "emptyDocument" });
    await expect(markdownToPdf("a".repeat(2_000_001), opts, fonts)).rejects.toBeInstanceOf(PdfToolError);
  });
});

describe("createFontMetrics", () => {
  const metrics = createFontMetrics(fonts);

  it("drops emoji and marks other missing characters", () => {
    expect(metrics.clean("Hazır 🚀👍🏽 ✅ 🇹🇷 漢字", "regular")).toBe("Hazır    ??");
    expect(metrics.clean("ğüşİ", "mono")).toBe("ğüşİ");
  });

  it("measures with the font's advance widths", () => {
    expect(metrics.width("MMMM", "mono", 10)).toBeCloseTo(metrics.width("iiii", "mono", 10));
    expect(metrics.width("MMMM", "regular", 10)).toBeGreaterThan(metrics.width("iiii", "regular", 10));
    expect(metrics.width("ab", "regular", 20)).toBeCloseTo(metrics.width("ab", "regular", 10) * 2);
  });
});
