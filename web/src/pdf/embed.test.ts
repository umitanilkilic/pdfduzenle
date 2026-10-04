import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { embedFont } from "./embed";
import { testFont } from "./testing";

describe("embedFont", () => {
  it("encodes text with the font's plain glyphs, which are the only ones with widths in the PDF", async () => {
    // Contextual alternates (e.g. Inter's raised parentheses next to capitals) have no character of their
    // own, so pdf-lib writes no width for them and viewers leave gaps around "(GPU)".
    const text = "Sunucu (GPU) [A] fi ffl 1/2";
    const doc = await PDFDocument.create();
    const font = await embedFont(doc, testFont());
    const encoded = font.encodeText(text).asString();
    const plain = fontkit.create(testFont());
    const expected = [...text].map((ch) =>
      plain.glyphForCodePoint(ch.codePointAt(0)!).id.toString(16).padStart(4, "0").toUpperCase(),
    );
    expect(encoded.match(/.{4}/g)).toEqual(expected);
  });
});
