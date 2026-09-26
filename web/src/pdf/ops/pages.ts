import { degrees } from "pdf-lib";
import { PdfToolError } from "../errors";
import type { Rotation } from "../geometry";
import { copyPages, loadPdf, savePdf } from "../load";

export type { Rotation };

export interface PagePlan {
  /** 0-based index in the source document. */
  index: number;
  /** Extra clockwise rotation added to the page's current rotation. */
  rotate: Rotation;
}

/**
 * Builds a new PDF from `plan`: pages in plan order, each optionally rotated.
 * This one primitive backs extract, remove, reorder and rotate.
 */
export async function organizePages(bytes: Uint8Array, plan: PagePlan[]): Promise<Uint8Array> {
  if (plan.length === 0) throw new PdfToolError("allPagesRemoved");
  const src = await loadPdf(bytes);
  const count = src.getPageCount();
  for (const { index } of plan) if (index < 0 || index >= count) throw new PdfToolError("pageOutOfRange");

  const out = await copyPages(
    src,
    plan.map((p) => p.index),
  );
  out.getPages().forEach((page, i) => {
    const extra = plan[i].rotate;
    if (extra) page.setRotation(degrees((page.getRotation().angle + extra) % 360));
  });
  return savePdf(out);
}

export async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await loadPdf(bytes)).getPageCount();
}

/** Keeps only `indices` (in the given order). */
export function extractPages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array> {
  return organizePages(
    bytes,
    indices.map((index) => ({ index, rotate: 0 })),
  );
}

/** Drops `indices`, keeping the remaining pages in order. */
export async function removePages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array> {
  const drop = new Set(indices);
  const count = await pageCount(bytes);
  const keep = Array.from({ length: count }, (_, i) => i).filter((i) => !drop.has(i));
  return extractPages(bytes, keep);
}

/** Rotates `indices` (or every page when omitted) by `angle` clockwise. */
export async function rotatePages(bytes: Uint8Array, angle: Rotation, indices?: number[]): Promise<Uint8Array> {
  const count = await pageCount(bytes);
  const targets = new Set(indices ?? Array.from({ length: count }, (_, i) => i));
  return organizePages(
    bytes,
    Array.from({ length: count }, (_, index) => ({ index, rotate: targets.has(index) ? angle : 0 })),
  );
}

/** Splits into one PDF per group of page indices. */
export async function splitPdf(bytes: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const out: Uint8Array[] = [];
  for (const group of groups) out.push(await extractPages(bytes, group));
  return out;
}
