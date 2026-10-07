import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFString, type PDFFont } from "pdf-lib";
import { hexToRgb } from "../color";
import { embedFont, TEXT_FEATURES } from "../embed";
import { PdfToolError } from "../errors";
import { savePdf } from "../load";
import { layoutMarkdown, type Face, type Metrics } from "../markdown/layout";
import { parseMarkdown } from "../markdown/parse";

export type MarkdownFonts = Record<Face, Uint8Array>;

export interface MarkdownPdfOptions {
  pageSize: "a4" | "letter";
  /** Body text size in points. */
  fontSize: number;
  margin: "narrow" | "normal" | "wide";
}

const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const;
const MARGINS = { narrow: 36, normal: 56, wide: 80 } as const;
/** Guards against huge inputs hanging the tab; about 2 MB of text. */
export const MAX_MARKDOWN_CHARS = 2_000_000;
const MAX_PAGES = 500;

// Emoji and their parts: skin tones, flags, keycaps, joiners, variation selectors and tag characters.
const DROPPED =
  /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|[\u200d\ufe0e\ufe0f\u20e3]|[\u{e0020}-\u{e007f}]/u;

/** Measures with fontkit (what pdf-lib embeds) and swaps characters a face can't draw. */
export function createFontMetrics(fonts: MarkdownFonts): Metrics {
  const parsed = new Map((Object.keys(fonts) as Face[]).map((face) => [face, fontkit.create(fonts[face])]));
  const widths = new Map<string, number>();
  const font = (face: Face) => parsed.get(face)!;
  return {
    width(text, face, size) {
      const key = `${face}\u0000${text}`;
      let units = widths.get(key);
      if (units === undefined) {
        const f = font(face);
        units = f.layout(text, TEXT_FEATURES).advanceWidth / f.unitsPerEm;
        widths.set(key, units);
      }
      return units * size;
    },
    clean(text, face) {
      const f = font(face);
      let out = "";
      for (const ch of text) {
        if (ch === "\n" || ch === " " || ch === "\t" || f.hasGlyphForCodePoint(ch.codePointAt(0)!)) out += ch;
        // Emoji are common in READMEs and no text font has them: drop them instead of printing "?".
        else if (!DROPPED.test(ch)) out += "?";
      }
      return out;
    },
  };
}

/** SVG path of a w×h rectangle with corner radius r, origin top-left. */
export function roundedRectPath(w: number, h: number, r: number): string {
  return [
    `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h}`,
    `H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`,
  ].join(" ");
}

/** Typesets GitHub-flavoured Markdown into a PDF with the embedded Inter/JetBrains Mono fonts. */
export async function markdownToPdf(
  markdown: string,
  opts: MarkdownPdfOptions,
  fonts: MarkdownFonts,
): Promise<Uint8Array> {
  if (markdown.length > MAX_MARKDOWN_CHARS) throw new PdfToolError("tooManyPages");
  const [width, height] = PAGE_SIZES[opts.pageSize] ?? PAGE_SIZES.a4;
  const layout = layoutMarkdown(
    parseMarkdown(markdown),
    { width, height, margin: MARGINS[opts.margin] ?? MARGINS.normal, fontSize: opts.fontSize, maxPages: MAX_PAGES },
    createFontMetrics(fonts),
  );
  if (!layout.ops.some((op) => op.kind === "text" && op.text.trim())) throw new PdfToolError("emptyDocument");

  const doc = await PDFDocument.create();
  const pages = Array.from({ length: layout.pageCount }, () => doc.addPage([width, height]));
  // Only faces the document uses are embedded; each one is a whole (pre-reduced) font file.
  const embedded = new Map<Face, PDFFont>();
  for (const op of layout.ops) {
    if (op.kind === "text" && !embedded.has(op.face)) embedded.set(op.face, await embedFont(doc, fonts[op.face]));
  }

  for (const op of layout.ops) {
    const page = pages[op.page];
    switch (op.kind) {
      case "text":
        page.drawText(op.text, {
          x: op.x,
          y: op.y,
          size: op.size,
          font: embedded.get(op.face),
          color: hexToRgb(op.color),
        });
        break;
      case "rect": {
        const fill = op.color ? { color: hexToRgb(op.color) } : {};
        const stroke = op.border ? { borderColor: hexToRgb(op.border.color), borderWidth: op.border.width } : {};
        const radius = Math.min(op.radius ?? 0, op.width / 2, op.height / 2);
        if (radius > 0) {
          // drawSvgPath measures y downwards from its origin, here the top-left corner.
          page.drawSvgPath(roundedRectPath(op.width, op.height, radius), {
            x: op.x,
            y: op.y + op.height,
            ...fill,
            ...stroke,
          });
        } else {
          page.drawRectangle({ x: op.x, y: op.y, width: op.width, height: op.height, ...fill, ...stroke });
        }
        break;
      }
      case "line":
        page.drawLine({
          start: { x: op.x1, y: op.y1 },
          end: { x: op.x2, y: op.y2 },
          thickness: op.width,
          color: hexToRgb(op.color),
        });
        break;
      case "link": {
        const annot = doc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [op.x, op.y, op.x + op.width, op.y + op.height],
          Border: [0, 0, 0],
          A: { Type: "Action", S: "URI", URI: PDFString.of(op.url) },
        });
        page.node.addAnnot(doc.context.register(annot));
        break;
      }
    }
  }
  if (layout.title) doc.setTitle(layout.title);
  return savePdf(doc);
}
