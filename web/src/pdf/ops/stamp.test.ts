import { describe, expect, it } from "vitest";
import { drawnGlyphOutlines, drawOrigins, makePdf, pageContent, pageIds, PNG_1X1, testFont } from "../testing";
import { addPageNumbers, addWatermark, placeImage, type PageNumberOptions } from "./stamp";

const font = testFont();

const numbers: PageNumberOptions = {
  vertical: "bottom",
  horizontal: "left",
  template: "{n}",
  start: 1,
  firstPage: 0,
  fontSize: 10,
  margin: 20,
  color: "#000000",
};

describe("addPageNumbers", () => {
  it("embeds an outline for every visible character, including Turkish ones", async () => {
    const out = await addPageNumbers(
      await makePdf(1),
      { ...numbers, template: "Sayfa {n} / {total} ığüşöçİĞÜŞÖÇ" },
      font,
    );
    const outlines = await drawnGlyphOutlines(out, 0);
    // "Sayfa 1 / 1 ığüşöçİĞÜŞÖÇ": 24 glyphs, of which the 4 spaces are blank.
    expect(outlines).toHaveLength(24);
    expect(outlines.filter((has) => !has)).toHaveLength(4);
  });

  it("numbers every page and keeps the page order", async () => {
    const out = await addPageNumbers(await makePdf(3), numbers, font);
    expect(await pageIds(out)).toEqual([0, 1, 2]);
    for (const i of [0, 1, 2]) expect(await drawOrigins(out, i, "Tm")).toHaveLength(1);
  });

  it("places bottom-left numbers at the margin on an upright page", async () => {
    const out = await addPageNumbers(await makePdf(1), numbers, font);
    const [[a, , , , e, f]] = await drawOrigins(out, 0, "Tm");
    expect(a).toBeCloseTo(1);
    expect([e, f]).toEqual([20, 20]);
  });

  it("follows the visual bottom-left corner on a page rotated 90°", async () => {
    // 100×200 page shown as 200×100: visual (20, 20) is page (100 - 20, 20), text turned 90°.
    const out = await addPageNumbers(await makePdf(1, { rotation: 90 }), numbers, font);
    const [[a, b, , , e, f]] = await drawOrigins(out, 0, "Tm");
    expect(a).toBeCloseTo(0);
    expect(b).toBeCloseTo(1);
    expect([e, f]).toEqual([80, 20]);
  });

  it("skips pages before firstPage", async () => {
    const out = await addPageNumbers(await makePdf(3), { ...numbers, firstPage: 1 }, font);
    expect(await drawOrigins(out, 0, "Tm")).toHaveLength(0);
    expect(await drawOrigins(out, 1, "Tm")).toHaveLength(1);
  });
});

describe("addWatermark", () => {
  it("embeds an outline for every visible character of a text watermark", async () => {
    const out = await addWatermark(
      await makePdf(1),
      { kind: "text", text: "GİZLİDİR ığüşöç", fontSize: 40, color: "#ff0000", opacity: 0.3, angle: 45 },
      font,
    );
    const outlines = await drawnGlyphOutlines(out, 0);
    expect(outlines).toHaveLength(15);
    expect(outlines.filter((has) => !has)).toHaveLength(1);
  });

  it("draws Turkish text on every page with the requested opacity", async () => {
    const out = await addWatermark(
      await makePdf(2),
      { kind: "text", text: "GİZLİDİR ğüşöç", fontSize: 30, color: "#ff0000", opacity: 0.3, angle: 45 },
      font,
    );
    for (const i of [0, 1]) {
      expect(await drawOrigins(out, i, "Tm")).toHaveLength(1);
      expect(await pageContent(out, i)).toMatch(/\/GS-\d+ gs/);
    }
  });

  it("rejects empty text", async () => {
    await expect(
      addWatermark(
        await makePdf(1),
        { kind: "text", text: "  ", fontSize: 30, color: "#000", opacity: 1, angle: 0 },
        font,
      ),
    ).rejects.toMatchObject({ code: "emptySelection" });
  });

  it("centres an image watermark", async () => {
    const out = await addWatermark(
      await makePdf(1),
      { kind: "image", image: PNG_1X1, mime: "image/png", scale: 0.5, opacity: 1, angle: 0 },
      font,
    );
    // 100×200 page, image 50×50 → bottom-left at (25, 75). pdf-lib emits translate, rotate, then scale.
    const [translate, , scale] = await drawOrigins(out, 0, "cm");
    expect(translate.slice(4)).toEqual([25, 75]);
    expect([scale[0], scale[3]]).toEqual([50, 50]);
  });
});

describe("placeImage", () => {
  it("places an image using fractions of the visual page", async () => {
    const out = await placeImage(await makePdf(2), PNG_1X1, "image/png", [
      { page: 1, x: 0.1, y: 0.1, width: 0.5, height: 0.25 },
    ]);
    expect(await drawOrigins(out, 0, "cm")).toHaveLength(0);
    // Page 1 is 101×200: top-left (10.1, 20) and 50.5×50 → bottom-left (10.1, 130).
    const [translate, , scale] = await drawOrigins(out, 1, "cm");
    expect([scale[0], scale[3]]).toEqual([50.5, 50]);
    expect(translate[4]).toBeCloseTo(10.1);
    expect(translate[5]).toBeCloseTo(130);
  });

  it("rejects invalid image data and missing pages", async () => {
    const pdf = await makePdf(1);
    const place = { page: 0, x: 0, y: 0, width: 0.1, height: 0.1 };
    await expect(placeImage(pdf, new Uint8Array([1, 2]), "image/png", [place])).rejects.toMatchObject({
      code: "unsupportedImage",
    });
    await expect(placeImage(pdf, PNG_1X1, "image/png", [{ ...place, page: 3 }])).rejects.toMatchObject({
      code: "pageOutOfRange",
    });
  });
});
