import { describe, expect, it } from "vitest";
import { PdfToolError } from "../errors";
import { COLORS, layoutMarkdown, type DrawOp, type Metrics, type PageSetup } from "./layout";
import { parseMarkdown } from "./parse";

// Every character is half the font size wide; the mono face has no "ş" (cleaned to "?").
const metrics: Metrics = {
  width: (text, _face, size) => text.length * size * 0.5,
  clean: (text, face) => (face === "mono" ? text.replace(/ş/g, "?") : text),
};
const setup: PageSetup = { width: 300, height: 400, margin: 30, fontSize: 10, maxPages: 50 };

function layout(md: string, s: Partial<PageSetup> = {}) {
  return layoutMarkdown(parseMarkdown(md), { ...setup, ...s }, metrics);
}
type TextOp = Extract<DrawOp, { kind: "text" }>;
type RectOp = Extract<DrawOp, { kind: "rect" }>;
/** Body text, without the page numbers and running title. */
const texts = (ops: DrawOp[]) => ops.filter((o): o is TextOp => o.kind === "text" && o.color !== COLORS.faint);
const furniture = (ops: DrawOp[]) => ops.filter((o): o is TextOp => o.kind === "text" && o.color === COLORS.faint);
const rects = (ops: DrawOp[]) => ops.filter((o): o is RectOp => o.kind === "rect");

describe("layoutMarkdown", () => {
  it("wraps paragraphs inside the margins and breaks words longer than a line", () => {
    const { ops } = layout(`${"kelime ".repeat(60)}\n\n${"x".repeat(100)}`);
    for (const op of texts(ops)) {
      expect(op.x).toBeGreaterThanOrEqual(30);
      expect(op.x + metrics.width(op.text, op.face, op.size)).toBeLessThanOrEqual(270 + 1e-9);
    }
    expect(texts(ops).filter((o) => /^x+$/.test(o.text)).length).toBeGreaterThan(1);
  });

  it("starts new pages and keeps every line inside the page", () => {
    const { pageCount, ops } = layout(Array.from({ length: 80 }, (_, i) => `Paragraf ${i + 1}`).join("\n\n"));
    expect(pageCount).toBeGreaterThan(1);
    for (const op of texts(ops)) {
      expect(op.y).toBeGreaterThanOrEqual(30);
      expect(op.y).toBeLessThanOrEqual(370);
      expect(op.page).toBeLessThan(pageCount);
    }
    expect(texts(ops).at(-1)?.text).toBe("Paragraf 80");
  });

  it("refuses documents longer than the page limit", () => {
    expect(() => layout("a\n\n".repeat(500), { maxPages: 3 })).toThrow(PdfToolError);
  });

  it("draws headings bold and larger and takes the first H1 as the title", () => {
    const { ops, title } = layout("Giriş\n\n# Rapor **2026**\n\n## Alt");
    const h1 = texts(ops).find((o) => o.text === "Rapor 2026");
    expect(h1).toMatchObject({ face: "bold", size: 21 });
    expect(texts(ops).find((o) => o.text === "Alt")).toMatchObject({ face: "bold", size: 15.5 });
    expect(title).toBe("Rapor 2026");
  });

  it("maps inline styles to font faces and makes links clickable", () => {
    const { ops } = layout("a **b** *c* ***d*** `e` [f](https://ornek.tr)");
    const face = (t: string) => texts(ops).find((o) => o.text.includes(t))?.face;
    expect([face("b"), face("c"), face("d"), face("e")]).toEqual(["bold", "italic", "boldItalic", "mono"]);
    const link = ops.find((o) => o.kind === "link");
    expect(link).toMatchObject({ url: "https://ornek.tr/" });
    expect(texts(ops).find((o) => o.text === "f")?.color).toBe("#0969da");
  });

  it("numbers ordered lists from their start, nests bullets and draws task boxes", () => {
    const { ops } = layout("3. üç\n4. dört\n\n- dış\n  - iç\n    - en iç\n\n- [x] bitti\n- [ ] kaldı");
    expect(
      texts(ops)
        .filter((o) => /^\d+\.$/.test(o.text))
        .map((o) => o.text),
    ).toEqual(["3.", "4."]);
    // Bullets are shapes (no glyph can go missing): filled disc, outlined circle, filled square.
    const bullets = rects(ops).filter((r) => r.width < 5 && r.height === r.width);
    expect(bullets.map((b) => [b.radius ? "round" : "square", b.color ? "filled" : "outline"])).toEqual([
      ["round", "filled"],
      ["round", "outline"],
      ["square", "filled"],
    ]);
    const boxes = rects(ops).filter((r) => r.border && r.width > 5);
    expect(boxes.map((b) => b.color)).toEqual([COLORS.accent, "#ffffff"]);
    const inner = texts(ops).find((o) => o.text === "iç")!;
    const outer = texts(ops).find((o) => o.text === "dış")!;
    expect(inner.x).toBeGreaterThan(outer.x);
  });

  it("sets code blocks in the mono face on a background, wrapping long lines and cleaning missing glyphs", () => {
    const { ops } = layout("```\nşu " + "y".repeat(80) + "\n```");
    const lines = texts(ops).filter((o) => o.face === "mono");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0].text.startsWith("?u ")).toBe(true);
    expect(rects(ops).filter((r) => r.color === COLORS.codeBg)).toHaveLength(1);
  });

  it("lays tables out in equal columns with a bold header and column alignment", () => {
    const { ops } = layout("| Ad | Tutar |\n|:-|-:|\n| Kalem | 5 |");
    const ad = texts(ops).find((o) => o.text === "Ad")!;
    const tutar = texts(ops).find((o) => o.text === "Tutar")!;
    const five = texts(ops).find((o) => o.text === "5")!;
    expect(ad.face).toBe("bold");
    expect(tutar.x).toBeGreaterThan(150);
    // Right-aligned: "5" ends where the column's padding starts.
    expect(five.x + metrics.width("5", five.face, five.size)).toBeCloseTo(270 - 10 * 0.55);
  });

  it("draws the quote bar on every page the quote spans", () => {
    const { ops, pageCount } = layout("> " + Array.from({ length: 60 }, (_, i) => `satır ${i}`).join("\n>\n> "));
    const bars = ops.filter((o) => o.kind === "rect" && o.width === 3);
    expect(pageCount).toBeGreaterThan(1);
    expect(new Set(bars.map((b) => b.page)).size).toBe(pageCount);
  });

  it("wraps code at spaces when it can and gives each page its own code background", () => {
    const { ops } = layout("```\n" + "kelime ".repeat(30) + "\n```");
    const lines = texts(ops).filter((o) => o.face === "mono");
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines.slice(0, -1)) expect(line.text.endsWith(" ")).toBe(true);

    const long = layout("```\n" + Array.from({ length: 60 }, (_, i) => `satır ${i}`).join("\n") + "\n```");
    const backgrounds = rects(long.ops).filter((r) => r.color === COLORS.codeBg);
    expect(long.pageCount).toBeGreaterThan(1);
    expect(backgrounds.map((b) => b.page)).toEqual(Array.from({ length: long.pageCount }, (_, p) => p));
    // Backgrounds are drawn before (under) the code on their page.
    for (const bg of backgrounds) {
      const firstText = long.ops.findIndex((o) => o.kind === "text" && o.page === bg.page && o.face === "mono");
      expect(long.ops.indexOf(bg)).toBeLessThan(firstText);
    }
  });

  it("numbers pages and repeats the title from page 2, only for multi-page documents", () => {
    expect(furniture(layout("# Kısa\n\nTek sayfa.").ops)).toEqual([]);
    const { ops, pageCount } = layout("# Uzun Rapor\n\n" + Array.from({ length: 80 }, (_, i) => `P ${i}`).join("\n\n"));
    const labels = furniture(ops).map((o) => `${o.page}:${o.text}`);
    expect(labels).toContain(`0:1 / ${pageCount}`);
    expect(labels).toContain(`1:Uzun Rapor`);
    expect(labels).not.toContain("0:Uzun Rapor");
    for (const op of furniture(ops)) expect(op.y < 30 || op.y > 370).toBe(true); // inside the margins only
  });
});
