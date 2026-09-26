import { PdfToolError } from "../errors";
import { MM_TO_PT, normalizeRotation, visualToPageMargins, type Margins } from "../geometry";
import { loadPdf, savePdf } from "../load";

/** Trims the visible page by the given margins (millimetres, as seen on screen). */
export async function cropPdf(bytes: Uint8Array, marginsMm: Margins, indices?: number[]): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const targets = indices ? new Set(indices) : null;

  doc.getPages().forEach((page, i) => {
    if (targets && !targets.has(i)) return;
    const m = visualToPageMargins(marginsMm, normalizeRotation(page.getRotation().angle));
    const box = page.getCropBox();
    const width = box.width - (m.left + m.right) * MM_TO_PT;
    const height = box.height - (m.top + m.bottom) * MM_TO_PT;
    if (width < 1 || height < 1) throw new PdfToolError("cropTooLarge");
    const x = box.x + m.left * MM_TO_PT;
    const y = box.y + m.bottom * MM_TO_PT;
    page.setCropBox(x, y, width, height);
    page.setTrimBox(x, y, width, height);
  });
  return savePdf(doc);
}
