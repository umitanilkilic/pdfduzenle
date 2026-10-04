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
  | {
      kind: "rect";
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
      /** Fill colour; omitted for an outline only. */
      color?: string;
      radius?: number;
      border?: { color: string; width: number };
    }
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
  heading: "#0d1117",
  muted: "#57606a",
  faint: "#8c959f",
  link: "#0969da",
  accent: "#0969da",
  codeBg: "#f6f8fa",
  codeBorder: "#e4e7eb",
  inlineCodeBg: "#eff1f3",
  border: "#d0d7de",
  rule: "#e4e7eb",
  headerBg: "#f3f5f7",
  zebra: "#fafbfc",
  quoteBg: "#f6f8fa",
} as const;

const LINE = 1.5;
const HEADING_SCALE = [2.1, 1.55, 1.25, 1.1, 1, 0.9];

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
  // Blocks with a background listen for page breaks to close their part on the old page.
  const breakListeners: ((bottom: number) => void)[] = [];
  function newPage() {
    for (const listener of breakListeners) listener(y);
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
    lineHeight = size * LINE,
  ) {
    for (const line of lines) {
      ensure(lineHeight);
      // Text sits optically centred in its line box.
      const baseline = y - (lineHeight - size) / 2 - size * 0.8;
      const lineWidth = line.reduce((sum, s) => sum + s.width, 0);
      let cx = align === "center" ? x + (maxWidth - lineWidth) / 2 : align === "right" ? x + maxWidth - lineWidth : x;
      for (const seg of line) {
        const segColor = seg.run.link ? COLORS.link : color;
        if (seg.run.code) {
          ops.push({
            kind: "rect",
            page,
            x: cx - 2,
            y: baseline - seg.size * 0.32,
            width: seg.width + 4,
            height: seg.size * 1.32,
            color: COLORS.inlineCodeBg,
            radius: 2.5,
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
      const gap = ctx.tight ? base * 0.3 : base * 0.85;
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
          ensure(base * 2);
          y -= base * 0.8;
          ops.push({ kind: "line", page, x1: x, y1: y, x2: x + width, y2: y, width: 0.8, color: COLORS.rule });
          y -= base * 1.2;
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
    ensure(size * 1.3 + base * LINE * 2 + (atTop() ? 0 : size * 0.7));
    if (!atTop()) y -= level <= 2 ? size * 0.7 : size * 0.55;
    drawLines(wrap(runs, width, size, true), x, width, size, COLORS.heading, "left", size * 1.25);
    if (level <= 2) {
      y -= size * 0.25;
      ops.push({
        kind: "line",
        page,
        x1: x,
        y1: y,
        x2: x + width,
        y2: y,
        width: level === 1 ? 1.2 : 0.7,
        color: level === 1 ? COLORS.border : COLORS.rule,
      });
      y -= size * 0.45;
    } else y -= size * 0.3;
  }

  interface Part {
    page: number;
    top: number;
    bottom: number;
    index: number;
  }

  /**
   * Runs `draw`, then inserts `paint(part)` behind what it drew, once per page the content spans, so a code
   * block or quote split by a page break gets a background on both pages.
   */
  function withBackground(draw: () => void, paint: (part: Part) => DrawOp[]) {
    const parts: Part[] = [];
    let current = { page, top: y, index: ops.length };
    const listener = (bottom: number) => {
      parts.push({ ...current, bottom });
      current = { page: current.page + 1, top: top(), index: ops.length };
    };
    breakListeners.push(listener);
    try {
      draw();
    } finally {
      breakListeners.splice(breakListeners.indexOf(listener), 1);
    }
    parts.push({ ...current, bottom: y });
    // Later parts first, so earlier insertion points stay valid.
    for (const part of parts.reverse()) ops.splice(part.index, 0, ...paint(part));
  }

  function list(
    ordered: boolean,
    start: number,
    items: ListItem[],
    x: number,
    width: number,
    ctx: { depth: number; color: string },
  ) {
    const indent = base * 1.7;
    items.forEach((item, i) => {
      ensure(base * LINE);
      const markerPage = page;
      const baseline = y - (base * LINE - base) / 2 - base * 0.8;
      if (item.checked !== null) {
        const box = base * 0.8;
        const bx = x + indent - box - base * 0.5;
        const by = baseline - base * 0.08;
        ops.push({
          kind: "rect",
          page: markerPage,
          x: bx,
          y: by,
          width: box,
          height: box,
          radius: 2,
          color: item.checked ? COLORS.accent : "#ffffff",
          border: { color: item.checked ? COLORS.accent : COLORS.border, width: 0.9 },
        });
        if (item.checked) {
          const check = (x1: number, y1: number, x2: number, y2: number): DrawOp => ({
            kind: "line",
            page: markerPage,
            x1: bx + box * x1,
            y1: by + box * y1,
            x2: bx + box * x2,
            y2: by + box * y2,
            width: 1.3,
            color: "#ffffff",
          });
          ops.push(check(0.24, 0.5, 0.43, 0.3), check(0.43, 0.3, 0.77, 0.72));
        }
      } else {
        if (ordered) {
          const marker = `${start + i}.`;
          const mw = metrics.width(marker, "regular", base);
          ops.push({
            kind: "text",
            page: markerPage,
            x: x + indent - mw - base * 0.5,
            y: baseline,
            text: marker,
            face: "regular",
            size: base,
            color: COLORS.muted,
          });
        } else {
          // Bullets are shapes, not glyphs: disc, circle, then square for deeper levels.
          const level = Math.min(ctx.depth, 2);
          const d = base * (level === 2 ? 0.3 : 0.34);
          const bx = x + indent - base * 0.5 - d - base * 0.15;
          const by = baseline + base * 0.33 - d / 2;
          ops.push({
            kind: "rect",
            page: markerPage,
            x: bx,
            y: by,
            width: d,
            height: d,
            radius: level === 2 ? 0 : d / 2,
            ...(level === 1 ? { border: { color: COLORS.muted, width: 0.8 } } : { color: COLORS.muted }),
          });
        }
      }
      layoutBlocks(item.blocks, x + indent, width - indent, { depth: ctx.depth + 1, color: ctx.color, tight: true });
      y -= base * 0.2;
    });
  }

  function quote(blocks: Block[], x: number, width: number, ctx: { depth: number }) {
    const padX = base * 1.1;
    const padY = base * 0.45;
    ensure(base * LINE + padY * 2);
    withBackground(
      () => {
        y -= padY;
        layoutBlocks(blocks, x + padX, width - padX * 1.6, { depth: ctx.depth, color: COLORS.muted, tight: true });
        y -= padY;
      },
      (part) => [
        {
          kind: "rect",
          page: part.page,
          x,
          y: part.bottom,
          width,
          height: part.top - part.bottom,
          color: COLORS.quoteBg,
          radius: 3,
        },
        {
          kind: "rect",
          page: part.page,
          x,
          y: part.bottom,
          width: 3,
          height: part.top - part.bottom,
          color: COLORS.border,
          radius: 1.5,
        },
      ],
    );
    y -= base * 0.85;
  }

  function code(text: string, x: number, width: number) {
    const size = base * 0.86;
    const lineHeight = size * 1.55;
    const padX = size * 1.1;
    const padY = size * 0.9;
    const charWidth = metrics.width("M", "mono", size);
    const perLine = Math.max(1, Math.floor((width - padX * 2) / charWidth));
    const visual: string[] = [];
    for (const line of metrics.clean(text, "mono").replace(/\n+$/, "").split("\n")) {
      let rest = line;
      // Long lines wrap at the last space that keeps at least half a line, else mid-word.
      while (rest.length > perLine) {
        const space = rest.lastIndexOf(" ", perLine);
        const cut = space > perLine / 2 ? space + 1 : perLine;
        visual.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      visual.push(rest);
    }
    ensure(lineHeight + padY * 2);
    withBackground(
      () => {
        y -= padY;
        for (const line of visual) {
          if (!ensure(lineHeight)) y -= padY;
          if (line.trim())
            ops.push({
              kind: "text",
              page,
              x: x + padX,
              y: y - (lineHeight - size) / 2 - size * 0.8,
              text: line,
              face: "mono",
              size,
              color: COLORS.text,
            });
          y -= lineHeight;
        }
        y -= padY;
      },
      (part) => [
        {
          kind: "rect",
          page: part.page,
          x,
          y: part.bottom,
          width,
          height: part.top - part.bottom,
          color: COLORS.codeBg,
          radius: 4,
          border: { color: COLORS.codeBorder, width: 0.6 },
        },
      ],
    );
  }

  function table(align: Align[], header: Run[][], rows: Run[][][], x: number, width: number) {
    const cols = Math.max(header.length, ...rows.map((r) => r.length), 1);
    const colWidth = width / cols;
    const pad = base * 0.55;
    const size = base * 0.92;
    const lineHeight = size * 1.45;
    const all = [{ cells: header, head: true }, ...rows.map((cells) => ({ cells, head: false }))];

    all.forEach(({ cells, head }, rowIndex) => {
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
        const background = head ? COLORS.headerBg : rowIndex % 2 === 0 ? COLORS.zebra : null;
        if (background)
          ops.push({ kind: "rect", page, x, y: y - rowHeight, width, height: rowHeight, color: background });
        const rowTop = y;
        for (let c = 0; c < cols; c++) {
          y = rowTop - pad;
          drawLines(
            wrapped[c].slice(offset, offset + take),
            x + c * colWidth + pad,
            colWidth - pad * 2,
            size,
            head ? COLORS.heading : COLORS.text,
            align[c] ?? "left",
            lineHeight,
          );
        }
        y = rowTop - rowHeight;
        if (head || rowIndex === 0)
          ops.push({
            kind: "line",
            page,
            x1: x,
            y1: rowTop,
            x2: x + width,
            y2: rowTop,
            width: 0.8,
            color: COLORS.border,
          });
        ops.push({
          kind: "line",
          page,
          x1: x,
          y1: y,
          x2: x + width,
          y2: y,
          width: head ? 1 : 0.6,
          color: head ? COLORS.border : COLORS.rule,
        });
        offset += take;
        if (offset < total) newPage();
      }
    });
  }

  /** "n / total" under each page and, from page 2, the document title above it. */
  function pageFurniture(pageCount: number) {
    if (pageCount < 2) return;
    const size = base * 0.78;
    for (let p = 0; p < pageCount; p++) {
      const label = `${p + 1} / ${pageCount}`;
      const w = metrics.width(label, "regular", size);
      ops.push({
        kind: "text",
        page: p,
        x: (pageW - w) / 2,
        y: margin * 0.45,
        text: label,
        face: "regular",
        size,
        color: COLORS.faint,
      });
      if (p > 0 && title) {
        let text = metrics.clean(title, "regular");
        const max = pageW - margin * 2;
        if (metrics.width(text, "regular", size) > max) {
          while (text.length > 1 && metrics.width(`${text}…`, "regular", size) > max) text = text.slice(0, -1);
          text = `${text.trimEnd()}…`;
        }
        ops.push({
          kind: "text",
          page: p,
          x: margin,
          y: pageH - margin * 0.55,
          text,
          face: "regular",
          size,
          color: COLORS.faint,
        });
      }
    }
  }

  layoutBlocks(blocks, margin, pageW - margin * 2, { depth: 0, color: COLORS.text, tight: false });
  pageFurniture(page + 1);
  return { pageCount: page + 1, ops, title };
}

/** Bold and italic are part of the face; these are the decorations drawn per segment. */
function sameStyle(a: Run, b: Run): boolean {
  return a.code === b.code && a.strike === b.strike && a.link === b.link;
}
