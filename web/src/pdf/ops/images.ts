import { PDFDocument } from "pdf-lib";
import { embedImage } from "../embed";
import { PdfToolError } from "../errors";
import { MM_TO_PT } from "../geometry";
import { savePdf } from "../load";

export interface ImageInput {
  bytes: Uint8Array;
  mime: string;
}

type PageSize = "fit" | "a4" | "letter";
type Orientation = "auto" | "portrait" | "landscape";

export interface ImagesToPdfOptions {
  pageSize: PageSize;
  orientation: Orientation;
  marginMm: number;
}

const SIZES: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

/** CSS pixels (96 dpi) to PDF points (72 dpi). */
const PX_TO_PT = 0.75;

export async function imagesToPdf(images: ImageInput[], opts: ImagesToPdfOptions): Promise<Uint8Array> {
  if (images.length === 0) throw new PdfToolError("noFiles");
  const doc = await PDFDocument.create();
  const margin = opts.marginMm * MM_TO_PT;

  for (const input of images) {
    const image = await embedImage(doc, input.bytes, input.mime);
    const imgW = image.width * PX_TO_PT;
    const imgH = image.height * PX_TO_PT;

    let pageW: number;
    let pageH: number;
    if (opts.pageSize === "fit") {
      pageW = imgW + 2 * margin;
      pageH = imgH + 2 * margin;
    } else {
      const [w, h] = SIZES[opts.pageSize];
      const landscape = opts.orientation === "landscape" || (opts.orientation === "auto" && imgW > imgH);
      [pageW, pageH] = landscape ? [h, w] : [w, h];
    }

    // Scale down (never up) to fit inside the margins, then centre.
    const scale = Math.min(1, (pageW - 2 * margin) / imgW, (pageH - 2 * margin) / imgH);
    const w = imgW * scale;
    const h = imgH * scale;
    doc.addPage([pageW, pageH]).drawImage(image, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
  }
  return savePdf(doc);
}
