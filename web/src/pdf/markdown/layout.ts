import type { FontFace } from "../fonts";
import { PdfToolError } from "../errors";
import type { Align, Block, ListItem, Run } from "./model";

export type Face = FontFace;

/** Text measurement and character support of the embedded fonts (fontkit in the worker, fakes in tests). */
export interface Metrics {
  width(text: string, face: Face, size: number): number;
  /** Replaces characters `face` has no glyph for, so nothing renders as an empty box. */
  clean(text: string, face: Face): string;
}

export interface PageSetup {
  width: number;
  height: number;
  margin: number;
  /** Body text size in points. */
  fontSize: number;
  maxPages: number;
}

export type DrawOp =
  | { kind: "text"; page: number; x: number; y: number; text: string; face: Face; size: number; color: string }
  | { kind: "rect"; page: number; x: number; y: number; width: number; height: number; color: string }
  | { kind: "line"; page: number; x1: number; y1: number; x2: number; y2: number; width: number; color: string }
  | { kind: "link"; page: number; x: number; y: number; width: number; height: number; url: string };

export interface Layout {
  pageCount: number;
  ops: DrawOp[];
  /** Text of the first level-1 heading, for the PDF title. */
  title?: string;
}

export const COLORS = {
  text: "#1f2328",
  muted: "#59636e",
  link: "#0969da",
  codeBg: "#f3f4f6",
  border: "#d1d9e0",
  headerBg: "#f6f8fa",
} as const;

const LINE = 1.45;
const HEADING_SCALE = [2, 1.6, 1.3, 1.15, 1, 0.9];
const BULLETS = ["•", "–", "·"];

interface Segment {
  text: string;
  face: Face;
  size: number;
  width: number;
  run: Run;
}

function faceOf(run: Run, forceBold: boolean): Face {
  if (run.code) return "mono";
  const bold = forceBold || run.bold;
  if (bold && run.italic) return "boldItalic";
  if (bold) return "bold";
  return run.italic ? "italic" : "regular";
}

/** Lays out parsed Markdown into pages of draw operations (PDF coordinates, origin bottom-left). */
export function layoutMarkdown(blocks: Block[], setup: PageSetup, metrics: Metrics): Layout {
  const { width: pageW, height: pageH, margin, fontSize: base } = setup;
  const ops: DrawOp[] = [];
  let page = 0;
  let y = pageH - margin;
  let title: string | undefined;

  const top = () => pageH - margin;
  function newPage() {
    page++;
    if (page >= setup.maxPages) throw new PdfToolError("tooManyPages");
    y = top();
  }
  /** Makes sure `height` fits on the current page; returns false when a new page was started. */
  function ensure(height: number): boolean {
    if (y - height >= margin) return true;
    newPage();
    return false;
  }
  const atTop = () => y === top();

  function wrap(runs: Run[], maxWidth: number, textSize: number, forceBold = false): Segment[][] {
    const lines: Segment[][] = [[]];
    let lineWidth = 0;
    let space: Segment | null = null;
    const current = () => lines[lines.length - 1];
    const breakLine = () => {
      lines.push([]);
      lineWidth = 0;
      space = null;
    };
    const append = (seg: Segment) => {
      const line = current();
      const last = line[line.length - 1];
      if (last && last.face === seg.face && last.size === seg.size && sameStyle(last.run, seg.run)) {
        last.text += seg.text;
        last.width += seg.width;
      } else line.push({ ...seg });
      lineWidth += seg.width;
    };

    for (const run of runs) {
      const face = faceOf(run, forceBold);
      const size = run.code ? textSize * 0.9 : textSize;
      const text = metrics.clean(run.text, face);
      for (const piece of text.match(/\n|[ \t]+|[^ \t\n]+/g) ?? []) {
        if (piece === "\n") {
          breakLine();
          continue;
        }
        if (/^[ \t]+$/.test(piece)) {
          if (current().length) space = { text: " ", face, size, width: metrics.width(" ", face, size), run };
          continue;
        }
        let word = piece;
        let w = metrics.width(word, face, size);
        const gap: number = space ? (space as Segment).width : 0;
        if (current().length && lineWidth + gap + w > maxWidth) breakLine();
        if (space && current().length) append(space);
        space = null;
        // A word longer than the line is split by characters.
        while (w > maxWidth - lineWidth && word.length > 1) {
          let cut = word.length - 1;
          while (cut > 1 && metrics.width(word.slice(0, cut), face, size) > maxWidth - lineWidth) cut--;
          if (lineWidth > 0 && metrics.width(word.slice(0, cut), face, size) > maxWidth - lineWidth) {
            breakLine();
            continue;
          }
          const head = word.slice(0, cut);
          append({ text: head, face, size, width: metrics.width(head, face, size), run });
          breakLine();
          word = word.slice(cut);
          w = metrics.width(word, face, size);
        }
        append({ text: word, face, size, width: w, run });
      }
    }
    if (lines.length > 1 && current().length === 0) lines.pop();
    return lines;
  }

  function drawLines(
    lines: Segment[][],
    x: number,
    maxWidth: number,
    size: number,
    color: string,
    align: Align = "left",
  ) {
    const lineHeight = size * LINE;
    for (const line of lines) {
      ensure(lineHeight);
      const baseline = y - size * 1.1;
      const lineWidth = line.reduce((sum, s) => sum + s.width, 0);
      let cx = align === "center" ? x + (maxWidth - lineWidth) / 2 : align === "right" ? x + maxWidth - lineWidth : x;
      for (const seg of line) {
        const segColor = seg.run.link ? COLORS.link : color;
        if (seg.run.code) {
          ops.push({
            kind: "rect",
            page,
            x: cx - 1.5,
            y: baseline - size * 0.28,
            width: seg.width + 3,
            height: size * 1.2,
            color: COLORS.codeBg,
          });
        }
        ops.push({
          kind: "text",
          page,
          x: cx,
          y: baseline,
          text: seg.text,
          face: seg.face,
          size: seg.size,
          color: segColor,
        });
        if (seg.run.link) {
          ops.push({
            kind: "line",
            page,
            x1: cx,
            y1: baseline - 1.5,
            x2: cx + seg.width,
            y2: baseline - 1.5,
            width: 0.6,
            color: COLORS.link,
          });
          ops.push({
            kind: "link",
            page,
            x: cx,
            y: baseline - size * 0.3,
            width: seg.width,
            height: size * 1.25,
            url: seg.run.link,
          });
        }
        if (seg.run.strike) {
          ops.push({
            kind: "line",
            page,
            x1: cx,
            y1: baseline + size * 0.3,
            x2: cx + seg.width,
            y2: baseline + size * 0.3,
            width: 0.7,
            color: segColor,
          });
        }
        cx += seg.width;
      }
      y -= lineHeight;
    }
  }

  function layoutBlocks(
    blocks: Block[],
    x: number,
    width: number,
    ctx: { depth: number; color: string; tight: boolean },
  ) {
    blocks.forEach((block, i) => {
      const last = i === blocks.length - 1;
      const gap = ctx.tight ? base * 0.25 : base * 0.8;
      switch (block.type) {
        case "paragraph":
          drawLines(wrap(block.runs, width, base), x, width, base, ctx.color);
          if (!last || !ctx.tight) y -= gap;
          break;
        case "heading":
          heading(block.level, block.runs, x, width);
          break;
        case "list":
          list(block.ordered, block.start, block.items, x, width, ctx);
          if (!ctx.tight || !last) y -= ctx.tight ? 0 : base * 0.4;
          break;
        case "quote":
          quote(block.blocks, x, width, ctx);
          break;
        case "code":
          code(block.text, x, width);
          y -= gap;
          break;
        case "rule":
          ensure(base);
          y -= base * 0.5;
          ops.push({ kind: "line", page, x1: x, y1: y, x2: x + width, y2: y, width: 1, color: COLORS.border });
          y -= base * 0.8;
          break;
        case "table":
          table(block.align, block.header, block.rows, x, width);
          y -= gap;
          break;
      }
    });
  }

  function heading(level: number, runs: Run[], x: number, width: number) {
    const size = base * HEADING_SCALE[level - 1];
    if (level === 1 && title === undefined)
      title =
        runs
          .map((r) => r.text)
          .join("")
          .trim() || undefined;
    // Keep a heading together with at least two lines of what follows.
    ensure(size * LINE + base * LINE * 2);
    if (!atTop()) y -= size * 0.5;
    drawLines(wrap(runs, width, size, true), x, width, size, COLORS.text);
    if (level <= 2) {
      y -= size * 0.15;
      ops.push({ kind: "line", page, x1: x, y1: y, x2: x + width, y2: y, width: 0.8, color: COLORS.border });
      y -= size * 0.35;
    } else y -= size * 0.3;
  }

  function list(
    ordered: boolean,
    start: number,
    items: ListItem[],
    x: number,
    width: number,
    ctx: { depth: number; color: string },
  ) {
    const indent = base * 1.6;
    items.forEach((item, i) => {
      ensure(base * LINE);
      const markerPage = page;
      const baseline = y - base * 1.1;
      if (item.checked !== null) {
        const box = base * 0.75;
        const bx = x + indent - box - base * 0.45;
        const by = baseline - base * 0.05;
        ops.push({ kind: "rect", page: markerPage, x: bx, y: by, width: box, height: box, color: COLORS.border });
        ops.push({
          kind: "rect",
          page: markerPage,
          x: bx + 0.8,
          y: by + 0.8,
          width: box - 1.6,
          height: box - 1.6,
          color: item.checked ? COLORS.link : "#ffffff",
        });
        if (item.checked) {
          ops.push({
            kind: "line",
            page: markerPage,
            x1: bx + box * 0.22,
            y1: by + box * 0.5,
            x2: bx + box * 0.42,
            y2: by + box * 0.28,
            width: 1.2,
            color: "#ffffff",
          });
          ops.push({
            kind: "line",
            page: markerPage,
            x1: bx + box * 0.42,
            y1: by + box * 0.28,
            x2: bx + box * 0.78,
            y2: by + box * 0.74,
            width: 1.2,
            color: "#ffffff",
          });
        }
      } else {
        const marker = ordered ? `${start + i}.` : BULLETS[Math.min(ctx.depth, BULLETS.length - 1)];
        const mw = metrics.width(marker, "regular", base);
        ops.push({
          kind: "text",
          page: markerPage,
          x: x + indent - mw - base * 0.45,
          y: baseline,
          text: marker,
          face: "regular",
          size: base,
          color: ctx.color,
        });
      }
      layoutBlocks(item.blocks, x + indent, width - indent, { depth: ctx.depth + 1, color: ctx.color, tight: true });
      y -= base * 0.25;
    });
  }

  function quote(blocks: Block[], x: number, width: number, ctx: { depth: number }) {
    const pad = base;
    const startPage = page;
    const startY = y;
    layoutBlocks(blocks, x + pad, width - pad, { depth: ctx.depth, color: COLORS.muted, tight: true });
    const endY = y + base * 0.2;
    // The bar follows the quote across page breaks.
    for (let p = startPage; p <= page; p++) {
      const from = p === startPage ? startY : top();
      const to = p === page ? endY : margin;
      ops.push({ kind: "rect", page: p, x, y: to, width: 3, height: from - to, color: COLORS.border });
    }
    y -= base * 0.8;
  }

  function code(text: string, x: number, width: number) {
    const size = base * 0.88;
    const lineHeight = size * LINE;
    const pad = size * 0.8;
    const charWidth = metrics.width("M", "mono", size);
    const perLine = Math.max(1, Math.floor((width - pad * 2) / charWidth));
    const visual: string[] = [];
    for (const line of metrics.clean(text, "mono").split("\n")) {
      if (line.length === 0) visual.push("");
      for (let i = 0; i < line.length; i += perLine) visual.push(line.slice(i, i + perLine));
    }
    ensure(lineHeight + pad);
    ops.push({ kind: "rect", page, x, y: y - pad / 2, width, height: pad / 2, color: COLORS.codeBg });
    y -= pad / 2;
    for (const line of visual) {
      ensure(lineHeight);
      ops.push({ kind: "rect", page, x, y: y - lineHeight, width, height: lineHeight, color: COLORS.codeBg });
      if (line)
        ops.push({
          kind: "text",
          page,
          x: x + pad,
          y: y - size * 1.1,
          text: line,
          face: "mono",
          size,
          color: COLORS.text,
        });
      y -= lineHeight;
    }
    ensure(pad / 2);
    ops.push({ kind: "rect", page, x, y: y - pad / 2, width, height: pad / 2, color: COLORS.codeBg });
    y -= pad / 2;
  }

  function table(align: Align[], header: Run[][], rows: Run[][][], x: number, width: number) {
    const cols = Math.max(header.length, ...rows.map((r) => r.length), 1);
    const colWidth = width / cols;
    const pad = base * 0.4;
    const size = base * 0.92;
    const lineHeight = size * LINE;
    const all = [{ cells: header, head: true }, ...rows.map((cells) => ({ cells, head: false }))];

    for (const { cells, head } of all) {
      const wrapped = Array.from({ length: cols }, (_, c) => wrap(cells[c] ?? [], colWidth - pad * 2, size, head));
      const total = Math.max(...wrapped.map((l) => (l.length === 1 && l[0].length === 0 ? 0 : l.length)), 1);
      let offset = 0;
      // Rows taller than the space left continue on the next page.
      while (offset < total) {
        let fit = Math.floor((y - margin - pad * 2) / lineHeight);
        if (fit < 1) {
          newPage();
          fit = Math.floor((y - margin - pad * 2) / lineHeight);
        }
        const take = Math.min(fit, total - offset);
        const rowHeight = take * lineHeight + pad * 2;
        if (head)
          ops.push({ kind: "rect", page, x, y: y - rowHeight, width, height: rowHeight, color: COLORS.headerBg });
        const rowTop = y;
        for (let c = 0; c < cols; c++) {
          y = rowTop - pad;
          drawLines(
            wrapped[c].slice(offset, offset + take),
            x + c * colWidth + pad,
            colWidth - pad * 2,
            size,
            COLORS.text,
            align[c] ?? "left",
          );
        }
        y = rowTop - rowHeight;
        for (let c = 0; c <= cols; c++) {
          const lx = x + c * colWidth;
          ops.push({ kind: "line", page, x1: lx, y1: rowTop, x2: lx, y2: y, width: 0.6, color: COLORS.border });
        }
        ops.push({
          kind: "line",
          page,
          x1: x,
          y1: rowTop,
          x2: x + width,
          y2: rowTop,
          width: 0.6,
          color: COLORS.border,
        });
        ops.push({ kind: "line", page, x1: x, y1: y, x2: x + width, y2: y, width: 0.6, color: COLORS.border });
        offset += take;
        if (offset < total) newPage();
      }
    }
  }

  layoutBlocks(blocks, margin, pageW - margin * 2, { depth: 0, color: COLORS.text, tight: false });
  return { pageCount: page + 1, ops, title };
}

/** Bold and italic are part of the face; these are the decorations drawn per segment. */
function sameStyle(a: Run, b: Run): boolean {
  return a.code === b.code && a.strike === b.strike && a.link === b.link;
}
