import { degrees, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { hexToRgb } from "../color";
import { PdfToolError } from "../errors";
import { embedFont, embedImage } from "../embed";
import { pageFrame, type VisualFrame } from "../geometry";
import { loadPdf, savePdf } from "../load";
import { pageLabel } from "../pageLabels";

/** Draws text upright (as seen on screen) with its bottom-left corner at the visual point (x, y). */
function drawVisualText(
  page: PDFPage,
  frame: VisualFrame,
  text: string,
  x: number,
  y: number,
  opts: { font: PDFFont; size: number; color: string; opacity?: number; angle?: number },
) {
  const p = frame.toPage(x, y);
  page.drawText(text, {
    x: p.x,
    y: p.y,
    font: opts.font,
    size: opts.size,
    color: hexToRgb(opts.color),
    opacity: opts.opacity ?? 1,
    rotate: degrees(frame.rotation + (opts.angle ?? 0)),
  });
}

function drawVisualImage(
  page: PDFPage,
  frame: VisualFrame,
  image: PDFImage,
  x: number,
  y: number,
  opts: { width: number; height: number; opacity?: number; angle?: number },
) {
  const p = frame.toPage(x, y);
  page.drawImage(image, {
    x: p.x,
    y: p.y,
    width: opts.width,
    height: opts.height,
    opacity: opts.opacity ?? 1,
    rotate: degrees(frame.rotation + (opts.angle ?? 0)),
  });
}

/** Bottom-left origin that centres a w×h box rotated by `angle` degrees on (cx, cy). */
function centeredOrigin(cx: number, cy: number, w: number, h: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: cx - (w / 2) * cos + (h / 2) * sin, y: cy - (w / 2) * sin - (h / 2) * cos };
}

// ── Page numbers ────────────────────────────────────────────────────────────

export type VerticalPosition = "top" | "bottom";
export type HorizontalPosition = "left" | "center" | "right";

export interface PageNumberOptions {
  vertical: VerticalPosition;
  horizontal: HorizontalPosition;
  /** "{n}" is replaced with the page number and "{total}" with the page count. */
  template: string;
  /** Number printed on the first numbered page. */
  start: number;
  /** 0-based index of the first page that gets a number (e.g. 1 to skip a cover page). */
  firstPage: number;
  fontSize: number;
  margin: number;
  color: string;
}

export async function addPageNumbers(
  bytes: Uint8Array,
  opts: PageNumberOptions,
  fontBytes: Uint8Array,
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const font = await embedFont(doc, fontBytes);
  const pages = doc.getPages();

  pages.forEach((page, i) => {
    const label = pageLabel(i, pages.length, opts);
    if (label === null) return;
    const frame = pageFrame(page);
    const width = font.widthOfTextAtSize(label, opts.fontSize);
    const x =
      opts.horizontal === "left"
        ? opts.margin
        : opts.horizontal === "right"
          ? frame.width - opts.margin - width
          : (frame.width - width) / 2;
    const y = opts.vertical === "bottom" ? opts.margin : frame.height - opts.margin - opts.fontSize;
    drawVisualText(page, frame, label, x, y, { font, size: opts.fontSize, color: opts.color });
  });
  return savePdf(doc);
}

// ── Watermark ───────────────────────────────────────────────────────────────

interface WatermarkBase {
  opacity: number;
  /** Counter-clockwise angle in degrees, as seen on screen. */
  angle: number;
}

interface TextWatermark extends WatermarkBase {
  kind: "text";
  text: string;
  fontSize: number;
  color: string;
}

interface ImageWatermark extends WatermarkBase {
  kind: "image";
  image: Uint8Array;
  mime: "image/png" | "image/jpeg";
  /** Image width as a fraction of the page width. */
  scale: number;
}

export type WatermarkOptions = TextWatermark | ImageWatermark;

export async function addWatermark(
  bytes: Uint8Array,
  opts: WatermarkOptions,
  fontBytes: Uint8Array,
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);

  if (opts.kind === "text") {
    if (!opts.text.trim()) throw new PdfToolError("emptySelection");
    const font = await embedFont(doc, fontBytes);
    for (const page of doc.getPages()) {
      const frame = pageFrame(page);
      const w = font.widthOfTextAtSize(opts.text, opts.fontSize);
      const h = font.heightAtSize(opts.fontSize, { descender: false });
      const o = centeredOrigin(frame.width / 2, frame.height / 2, w, h, opts.angle);
      drawVisualText(page, frame, opts.text, o.x, o.y, {
        font,
        size: opts.fontSize,
        color: opts.color,
        opacity: opts.opacity,
        angle: opts.angle,
      });
    }
  } else {
    const image = await embedImage(doc, opts.image, opts.mime);
    for (const page of doc.getPages()) {
      const frame = pageFrame(page);
      const w = frame.width * opts.scale;
      const h = (image.height / image.width) * w;
      const o = centeredOrigin(frame.width / 2, frame.height / 2, w, h, opts.angle);
      drawVisualImage(page, frame, image, o.x, o.y, { width: w, height: h, opacity: opts.opacity, angle: opts.angle });
    }
  }
  return savePdf(doc);
}

// ── Signature / image placement ─────────────────────────────────────────────

export interface Placement {
  /** 0-based page index. */
  page: number;
  /** Top-left corner and size as fractions (0–1) of the page as seen on screen. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function placeImage(
  bytes: Uint8Array,
  image: Uint8Array,
  mime: "image/png" | "image/jpeg",
  placements: Placement[],
): Promise<Uint8Array> {
  if (placements.length === 0) throw new PdfToolError("emptySelection");
  const doc = await loadPdf(bytes);
  const embedded = await embedImage(doc, image, mime);
  const pages = doc.getPages();
  for (const p of placements) {
    const page = pages[p.page];
    if (!page) throw new PdfToolError("pageOutOfRange");
    const frame = pageFrame(page);
    const w = p.width * frame.width;
    const h = p.height * frame.height;
    drawVisualImage(page, frame, embedded, p.x * frame.width, frame.height - p.y * frame.height - h, {
      width: w,
      height: h,
    });
  }
  return savePdf(doc);
}
