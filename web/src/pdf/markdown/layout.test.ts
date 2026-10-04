import { describe, expect, it } from "vitest";
import { PdfToolError } from "../errors";
import { layoutMarkdown, type DrawOp, type Metrics, type PageSetup } from "./layout";
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
const texts = (ops: DrawOp[]) => ops.filter((o): o is Extract<DrawOp, { kind: "text" }> => o.kind === "text");

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
    expect(h1).toMatchObject({ face: "bold", size: 20 });
    expect(texts(ops).find((o) => o.text === "Alt")).toMatchObject({ face: "bold", size: 16 });
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
    const { ops } = layout("3. üç\n4. dört\n\n- dış\n  - iç\n\n- [x] bitti\n- [ ] kaldı");
    const markers = texts(ops)
      .filter((o) => ["3.", "4.", "•", "–"].includes(o.text))
      .map((o) => o.text);
    expect(markers).toEqual(["3.", "4.", "•", "–"]);
    const boxes = ops.filter((o) => o.kind === "rect" && o.color === "#0969da");
    expect(boxes).toHaveLength(1); // only the checked box is filled
    const inner = texts(ops).find((o) => o.text === "iç")!;
    const outer = texts(ops).find((o) => o.text === "dış")!;
    expect(inner.x).toBeGreaterThan(outer.x);
  });

  it("sets code blocks in the mono face on a background, wrapping long lines and cleaning missing glyphs", () => {
    const { ops } = layout("```\nşu " + "y".repeat(80) + "\n```");
    const lines = texts(ops).filter((o) => o.face === "mono");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0].text.startsWith("?u ")).toBe(true);
    expect(ops.some((o) => o.kind === "rect" && o.color === "#f3f4f6")).toBe(true);
  });

  it("lays tables out in equal columns with a bold header and column alignment", () => {
    const { ops } = layout("| Ad | Tutar |\n|:-|-:|\n| Kalem | 5 |");
    const ad = texts(ops).find((o) => o.text === "Ad")!;
    const tutar = texts(ops).find((o) => o.text === "Tutar")!;
    const five = texts(ops).find((o) => o.text === "5")!;
    expect(ad.face).toBe("bold");
    expect(tutar.x).toBeGreaterThan(150);
    // Right-aligned: "5" ends where the column's padding starts.
    expect(five.x + metrics.width("5", five.face, five.size)).toBeCloseTo(270 - 10 * 0.4);
  });

  it("draws the quote bar on every page the quote spans", () => {
    const { ops, pageCount } = layout("> " + Array.from({ length: 60 }, (_, i) => `satır ${i}`).join("\n>\n> "));
    const bars = ops.filter((o) => o.kind === "rect" && o.width === 3);
    expect(pageCount).toBeGreaterThan(1);
    expect(new Set(bars.map((b) => b.page)).size).toBe(pageCount);
  });
});
