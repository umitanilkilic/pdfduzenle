import { describe, expect, it } from "vitest";
import { decodeEntities, parseMarkdown, safeLink } from "./parse";

describe("parseMarkdown", () => {
  it("keeps inline styles, Turkish text and links", () => {
    const [p] = parseMarkdown("Metin **kalın _iç_** `a<b && c` [bağ](https://örnek.tr/ş) ~~eski~~");
    expect(p).toEqual({
      type: "paragraph",
      runs: [
        { text: "Metin " },
        { bold: true, text: "kalın " },
        { bold: true, italic: true, text: "iç" },
        { text: " " },
        { code: true, text: "a<b && c" },
        { text: " " },
        { link: "https://xn--rnek-4qa.tr/%C5%9F", text: "bağ" },
        { text: " " },
        { strike: true, text: "eski" },
      ],
    });
  });

  it("parses headings, nested and task lists, quotes, code, rules and tables", () => {
    const md = [
      "# Başlık",
      "",
      "- [x] bitti",
      "  - iç",
      "",
      "3. üç",
      "",
      "> alıntı",
      "",
      "```js",
      "if (a) {\n\treturn;\n}",
      "```",
      "",
      "---",
      "",
      "| A | B |",
      "|:-|-:|",
      "| 1 | **2** |",
    ].join("\n");
    expect(parseMarkdown(md)).toEqual([
      { type: "heading", level: 1, runs: [{ text: "Başlık" }] },
      {
        type: "list",
        ordered: false,
        start: 1,
        items: [
          {
            checked: true,
            blocks: [
              { type: "paragraph", runs: [{ text: "bitti" }] },
              {
                type: "list",
                ordered: false,
                start: 1,
                items: [{ checked: null, blocks: [{ type: "paragraph", runs: [{ text: "iç" }] }] }],
              },
            ],
          },
        ],
      },
      {
        type: "list",
        ordered: true,
        start: 3,
        items: [{ checked: null, blocks: [{ type: "paragraph", runs: [{ text: "üç" }] }] }],
      },
      { type: "quote", blocks: [{ type: "paragraph", runs: [{ text: "alıntı" }] }] },
      { type: "code", text: "if (a) {\n    return;\n}" },
      { type: "rule" },
      {
        type: "table",
        align: ["left", "right"],
        header: [[{ text: "A" }], [{ text: "B" }]],
        rows: [[[{ text: "1" }], [{ bold: true, text: "2" }]]],
      },
    ]);
  });

  it("drops raw HTML, keeps image alt text and never makes unsafe links clickable", () => {
    const blocks = parseMarkdown('<div align="center">x</div>\n\nA <b>b</b> ![logo](x.png) [js](javascript:alert(1))');
    expect(blocks).toEqual([
      {
        type: "paragraph",
        runs: [
          { text: "A " },
          { text: "b" },
          { text: " " },
          { italic: true, text: "[logo]" },
          { text: " " },
          { text: "js" },
        ],
      },
    ]);
  });

  it("handles a BOM, Windows line endings, line breaks and entities", () => {
    expect(parseMarkdown("﻿a  \r\nb &amp; &#351;")).toEqual([
      { type: "paragraph", runs: [{ text: "a" }, { text: "\n" }, { text: "b & ş" }] },
    ]);
  });
});

describe("decodeEntities / safeLink", () => {
  it("decodes named and numeric entities, leaving unknown ones", () => {
    expect(decodeEntities("&lt;&#x15F;&#287;&foo;&#0;")).toBe("<şğ&foo;&#0;");
  });

  it("allows http(s) and mailto only", () => {
    expect(safeLink("mailto:a@b.tr")).toBe("mailto:a@b.tr");
    expect(safeLink("javascript:alert(1)")).toBeUndefined();
    expect(safeLink("relative/path")).toBeUndefined();
  });
});
