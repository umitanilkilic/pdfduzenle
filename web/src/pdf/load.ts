import { PDFDocument } from "pdf-lib";
import { PdfToolError } from "./errors";

/** Loads a PDF, turning pdf-lib failures into typed errors. */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (err) {
    if (isEncryptedError(err)) throw new PdfToolError("encrypted");
    throw new PdfToolError("invalidPdf", err instanceof Error ? err.message : undefined);
  }
}

/**
 * pdf-lib's EncryptedPDFError keeps the plain name "Error" and `instanceof` is unreliable across its
 * CommonJS/ESM builds, so the message is the only dependable signal.
 */
function isEncryptedError(err: unknown): boolean {
  return err instanceof Error && /\bis encrypted\b/.test(err.message);
}

/** Saves with a consistent producer so output files are recognisable. */
export async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  doc.setProducer("pdfduzenle.tr");
  return doc.save();
}

/** Copies the given pages (0-based, in order) of `source` into a new document. */
export async function copyPages(source: PDFDocument, indices: number[]): Promise<PDFDocument> {
  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, indices);
  for (const page of pages) out.addPage(page);
  return out;
}
