import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { MM_TO_PT } from "../geometry";
import { makePdf, PNG_1X1 } from "../testing";
import { cropPdf } from "./crop";
import { imagesToPdf } from "./images";
import { readMetadata, writeMetadata } from "./metadata";

async function cropBoxes(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => {
    const b = p.getCropBox();
    return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 100) / 100);
  });
}

describe("cropPdf", () => {
  const mm = (v: number) => Math.round(v * MM_TO_PT * 100) / 100;

  it("trims each side of an upright page", async () => {
    const out = await cropPdf(await makePdf(1), { top: 10, right: 0, bottom: 5, left: 2 });
    expect(await cropBoxes(out)).toEqual([
      [mm(2), mm(5), Math.round((100 - 2 * MM_TO_PT) * 100) / 100, Math.round((200 - 15 * MM_TO_PT) * 100) / 100],
    ]);
  });

  it("maps visual sides onto a rotated page", async () => {
    // Rotated 90°: the visual top is the page's left edge.
    const out = await cropPdf(await makePdf(1, { rotation: 90 }), { top: 10, right: 0, bottom: 0, left: 0 });
    const [[x, y]] = await cropBoxes(out);
    expect([x, y]).toEqual([mm(10), 0]);
  });

  it("only touches the selected pages", async () => {
    const out = await cropPdf(await makePdf(2), { top: 1, right: 1, bottom: 1, left: 1 }, [1]);
    expect((await cropBoxes(out))[0]).toEqual([0, 0, 100, 200]);
  });

  it("refuses margins larger than the page", async () => {
    await expect(cropPdf(await makePdf(1), { top: 0, right: 20, bottom: 0, left: 20 })).rejects.toMatchObject({
      code: "cropTooLarge",
    });
  });
});

describe("imagesToPdf", () => {
  const png = { bytes: PNG_1X1, mime: "image/png" };

  it("creates one page per image", async () => {
    const out = await imagesToPdf([png, png, png], { pageSize: "a4", orientation: "portrait", marginMm: 10 });
    expect((await PDFDocument.load(out)).getPageCount()).toBe(3);
  });

  it("sizes 'fit' pages to the image plus margins", async () => {
    const out = await imagesToPdf([png], { pageSize: "fit", orientation: "auto", marginMm: 0 });
    const page = (await PDFDocument.load(out)).getPage(0);
    expect(page.getSize()).toEqual({ width: 0.75, height: 0.75 });
  });

  it("uses landscape A4 when asked", async () => {
    const out = await imagesToPdf([png], { pageSize: "a4", orientation: "landscape", marginMm: 0 });
    const { width, height } = (await PDFDocument.load(out)).getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
  });

  it("rejects unsupported formats and empty input", async () => {
    const opts = { pageSize: "a4", orientation: "auto", marginMm: 0 } as const;
    await expect(imagesToPdf([{ bytes: PNG_1X1, mime: "image/gif" }], opts)).rejects.toMatchObject({
      code: "unsupportedImage",
    });
    await expect(imagesToPdf([], opts)).rejects.toMatchObject({ code: "noFiles" });
  });
});

describe("metadata", () => {
  it("round-trips document properties including Turkish characters", async () => {
    const meta = {
      title: "Yıllık Rapor",
      author: "Ümit Ağaoğlu",
      subject: "Özet",
      keywords: "rapor, şirket",
      creator: "Test",
    };
    const out = await writeMetadata(await makePdf(2), meta);
    expect(await readMetadata(out)).toEqual({ ...meta, keywords: "rapor şirket", pageCount: 2 });
  });
});
