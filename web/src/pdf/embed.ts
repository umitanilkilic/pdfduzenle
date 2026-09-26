import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont, PDFImage } from "pdf-lib";
import { PdfToolError } from "./errors";

/** Embeds a TrueType font (subset) so Turkish characters render correctly. */
export async function embedFont(doc: PDFDocument, fontBytes: Uint8Array): Promise<PDFFont> {
  doc.registerFontkit(fontkit);
  return doc.embedFont(fontBytes, { subset: true });
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
