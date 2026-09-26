import { describe, expect, it } from "vitest";
import { createGatewayClient } from "@/api/gateway";
import { getDictionary } from "@/i18n";
import { createInlineEngine } from "@/pdf/engine";
import { makePdf, pageIds, pageRotations, testFont } from "@/pdf/testing";
import crop from "./crop";
import extractPages from "./extract-pages";
import merge from "./merge";
import metadata from "./metadata";
import organize from "./organize";
import pageNumbers from "./page-numbers";
import removePages from "./remove-pages";
import rotate from "./rotate";
import split from "./split";
import type { ToolImpl, ToolServices } from "./types";

const services: ToolServices = {
  engine: createInlineEngine(),
  // Browser tools must never call the gateway.
  gateway: createGatewayClient(() => {
    throw new Error("unexpected network call");
  }),
  loadFont: async () => testFont(),
  dict: getDictionary("tr"),
  locale: "tr",
};

async function pdfFile(pages: number, name = "rapor.pdf") {
  return new File([(await makePdf(pages)) as BlobPart], name, { type: "application/pdf" });
}

function run<O>(tool: ToolImpl<O>, files: File[], options: Partial<O> = {}) {
  return tool.run({ files, options: { ...tool.initialOptions(services), ...options }, report: () => {} }, services);
}

describe("browser tools", () => {
  it("merge: one output named after the first file", async () => {
    const [out] = await run(merge, [await pdfFile(2), await pdfFile(1, "ek.pdf")]);
    expect(out.name).toBe("rapor-birlestirilmis.pdf");
    expect(await pageIds(out.bytes)).toEqual([0, 1, 0]);
  });

  it("split: ranges, every page and chunks", async () => {
    const file = await pdfFile(5);
    const byRange = await run(split, [file], { mode: "ranges", ranges: "1-2, 5" });
    expect(await Promise.all(byRange.map((o) => pageIds(o.bytes)))).toEqual([[0, 1], [4]]);
    expect(byRange.map((o) => o.name)).toEqual(["rapor-bolum-1.pdf", "rapor-bolum-2.pdf"]);
    expect(await run(split, [file], { mode: "every" })).toHaveLength(5);
    expect(await run(split, [file], { mode: "chunk", chunk: 2 })).toHaveLength(3);
  });

  it("split: reports an invalid range", async () => {
    await expect(run(split, [await pdfFile(2)], { mode: "ranges", ranges: "3" })).rejects.toMatchObject({
      code: "pageOutOfRange",
    });
  });

  it("remove and extract pages use the typed selection", async () => {
    const file = await pdfFile(5);
    const [removed] = await run(removePages, [file], { selection: "2-3" });
    expect(await pageIds(removed.bytes)).toEqual([0, 3, 4]);
    const [extracted] = await run(extractPages, [file], { selection: "5, 1" });
    expect(await pageIds(extracted.bytes)).toEqual([0, 4]);
  });

  it("rotate: one output per input file", async () => {
    const outputs = await run(rotate, [await pdfFile(2), await pdfFile(1, "b.pdf")], { angle: 180 });
    expect(outputs.map((o) => o.name)).toEqual(["rapor-dondurulmus.pdf", "b-dondurulmus.pdf"]);
    expect(await pageRotations(outputs[0].bytes)).toEqual([180, 180]);
  });

  it("organize: applies order, rotation and removal", async () => {
    const [out] = await run(organize, [await pdfFile(3)], {
      pages: [
        { index: 2, rotate: 90, removed: false },
        { index: 1, rotate: 0, removed: true },
        { index: 0, rotate: 0, removed: false },
      ],
    });
    expect(await pageIds(out.bytes)).toEqual([2, 0]);
    expect(await pageRotations(out.bytes)).toEqual([90, 0]);
  });

  it("organize: keeps the document as is before the grid has loaded", async () => {
    const [out] = await run(organize, [await pdfFile(3)]);
    expect(await pageIds(out.bytes)).toEqual([0, 1, 2]);
  });

  it("page numbers: produces a numbered copy", async () => {
    const [out] = await run(pageNumbers, [await pdfFile(2)], { skipFirst: true });
    expect(out.name).toBe("rapor-numarali.pdf");
    expect(await pageIds(out.bytes)).toEqual([0, 1]);
  });

  it("metadata: writes the edited fields only", async () => {
    const [out] = await run(metadata, [await pdfFile(1)], { title: "Başlık", author: "Ümit", loaded: true });
    const meta = await services.engine.readMetadata(out.bytes);
    expect(meta).toMatchObject({ title: "Başlık", author: "Ümit", pageCount: 1 });
  });

  it("crop: treats invalid margins as zero", async () => {
    const [out] = await run(crop, [await pdfFile(1)], { top: Number.NaN, right: -5, bottom: 0, left: 0 });
    expect(await pageIds(out.bytes)).toEqual([0]);
  });
});
