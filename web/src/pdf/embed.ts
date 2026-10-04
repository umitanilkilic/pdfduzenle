import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont, PDFImage } from "pdf-lib";
import { PdfToolError } from "./errors";

/**
 * OpenType substitutions (ligatures, contextual and case alternates) are turned off: pdf-lib only writes
 * widths for glyphs that have a character of their own, so substituted glyphs got the default width and
 * viewers drew gaps (e.g. "( GPU)"). Kerning is a positioning feature and pdf-lib ignores it anyway.
 */
export const TEXT_FEATURES = {
  liga: false,
  clig: false,
  dlig: false,
  calt: false,
  rlig: false,
  rclt: false,
  ccmp: false,
  locl: false,
  case: false,
  frac: false,
  numr: false,
  dnom: false,
  rvrn: false,
};

/**
 * Embeds a TrueType font so Turkish characters render correctly. The whole font is embedded: fontkit's
 * subsetter produced corrupt glyph data for Inter (blank characters in every viewer), so the shipped font is
 * already reduced to the scripts we need (`public/fonts/Inter-400.ttf`, see AGENTS.md).
 */
export async function embedFont(doc: PDFDocument, fontBytes: Uint8Array): Promise<PDFFont> {
  doc.registerFontkit(fontkit);
  return doc.embedFont(fontBytes, { subset: false, features: TEXT_FEATURES });
}

/** Embeds a PNG or JPEG; anything else (or corrupt data) is an `unsupportedImage` error. */
export async function embedImage(doc: PDFDocument, bytes: Uint8Array, mime: string): Promise<PDFImage> {
  const embed = mime === "image/png" ? doc.embedPng : mime === "image/jpeg" ? doc.embedJpg : null;
  if (!embed) throw new PdfToolError("unsupportedImage");
  try {
    return await embed.call(doc, bytes);
  } catch {
    throw new PdfToolError("unsupportedImage");
  }
}
