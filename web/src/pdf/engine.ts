import { cropPdf } from "./ops/crop";
import { imagesToPdf } from "./ops/images";
import { mergePdfs } from "./ops/merge";
import { readMetadata, writeMetadata } from "./ops/metadata";
import { extractPages, organizePages, pageCount, removePages, rotatePages, splitPdf } from "./ops/pages";
import { addPageNumbers, addWatermark, placeImage } from "./ops/stamp";

/** Every operation the browser tools can run. Keys are the RPC names used by the worker. */
export const operations = {
  mergePdfs,
  splitPdf,
  extractPages,
  removePages,
  rotatePages,
  organizePages,
  pageCount,
  addPageNumbers,
  addWatermark,
  placeImage,
  cropPdf,
  imagesToPdf,
  readMetadata,
  writeMetadata,
};

export type Operations = typeof operations;
export type OperationName = keyof Operations;

/** Async facade over the operations; implemented by a Web Worker in the browser and inline in tests. */
export type PdfEngine = {
  [K in OperationName]: (...args: Parameters<Operations[K]>) => Promise<Awaited<ReturnType<Operations[K]>>>;
};

/** Runs operations on the calling thread. */
export function createInlineEngine(): PdfEngine {
  return operations as unknown as PdfEngine;
}
