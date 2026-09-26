import { describe, expect, it } from "vitest";
import { PdfToolError } from "../errors";
import { makePdf, pageIds, pageRotations } from "../testing";
import { mergePdfs } from "./merge";
import { chunkGroups, everyPageGroups, extractPages, organizePages, removePages, rotatePages, splitPdf } from "./pages";

describe("mergePdfs", () => {
  it("concatenates files in order", async () => {
    const a = await makePdf(2);
    const b = await makePdf(3);
    expect(await pageIds(await mergePdfs([a, b]))).toEqual([0, 1, 0, 1, 2]);
  });

  it("rejects an empty list", async () => {
    await expect(mergePdfs([])).rejects.toMatchObject({ code: "noFiles" });
  });

  it("reports invalid input as invalidPdf", async () => {
    await expect(mergePdfs([new Uint8Array([1, 2, 3])])).rejects.toBeInstanceOf(PdfToolError);
    await expect(mergePdfs([new Uint8Array([1, 2, 3])])).rejects.toMatchObject({ code: "invalidPdf" });
  });
});

describe("organizePages", () => {
  it("reorders, drops and rotates pages", async () => {
    const out = await organizePages(await makePdf(4), [
      { index: 3, rotate: 90 },
      { index: 0, rotate: 0 },
      { index: 2, rotate: 180 },
    ]);
    expect(await pageIds(out)).toEqual([3, 0, 2]);
    expect(await pageRotations(out)).toEqual([90, 0, 180]);
  });

  it("adds to an existing rotation", async () => {
    const out = await organizePages(await makePdf(1, { rotation: 270 }), [{ index: 0, rotate: 180 }]);
    expect(await pageRotations(out)).toEqual([90]);
  });

  it("refuses to produce an empty document", async () => {
    await expect(organizePages(await makePdf(2), [])).rejects.toMatchObject({ code: "allPagesRemoved" });
  });

  it("rejects indices outside the document", async () => {
    await expect(organizePages(await makePdf(2), [{ index: 2, rotate: 0 }])).rejects.toMatchObject({
      code: "pageOutOfRange",
    });
  });
});

describe("page helpers", () => {
  it("extracts pages in the given order", async () => {
    expect(await pageIds(await extractPages(await makePdf(5), [4, 1]))).toEqual([4, 1]);
  });

  it("removes pages", async () => {
    expect(await pageIds(await removePages(await makePdf(5), [0, 3]))).toEqual([1, 2, 4]);
  });

  it("rotates only the selected pages", async () => {
    expect(await pageRotations(await rotatePages(await makePdf(3), 90, [1]))).toEqual([0, 90, 0]);
    expect(await pageRotations(await rotatePages(await makePdf(2), 270))).toEqual([270, 270]);
  });

  it("splits into groups", async () => {
    const parts = await splitPdf(await makePdf(5), [[0, 1], [4]]);
    expect(await Promise.all(parts.map(pageIds))).toEqual([[0, 1], [4]]);
  });

  it("builds split groups", () => {
    expect(everyPageGroups(3)).toEqual([[0], [1], [2]]);
    expect(chunkGroups(5, 2)).toEqual([[0, 1], [2, 3], [4]]);
    expect(() => chunkGroups(5, 0)).toThrow(PdfToolError);
  });
});
