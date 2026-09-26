import { PDFDocument } from "pdf-lib";
import { PdfToolError } from "../errors";
import { loadPdf, savePdf } from "../load";

/** Concatenates PDFs in the given order. */
export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  if (files.length === 0) throw new PdfToolError("noFiles");
  const out = await PDFDocument.create();
  for (const bytes of files) {
    const src = await loadPdf(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) out.addPage(page);
  }
  return savePdf(out);
}
