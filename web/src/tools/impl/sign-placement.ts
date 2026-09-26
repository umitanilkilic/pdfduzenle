import type { Placement } from "@/pdf/ops/stamp";

export interface SignatureBox {
  /** Top-left corner and width as fractions of the visual page. */
  x: number;
  y: number;
  width: number;
}

/**
 * Height fraction that keeps the signature's aspect ratio on a page of the given aspect ratio
 * (both width / height).
 */
export function boxHeight(box: SignatureBox, pageAspect: number, signatureAspect: number): number {
  return (box.width * pageAspect) / signatureAspect;
}

/** Keeps the box fully on the page. */
export function clampBox(box: SignatureBox, height: number): SignatureBox {
  const width = Math.min(Math.max(box.width, 0.03), 1);
  return {
    width,
    x: Math.min(Math.max(box.x, 0), 1 - width),
    y: Math.min(Math.max(box.y, 0), Math.max(0, 1 - height)),
  };
}

export function placements(
  box: SignatureBox,
  pageAspect: number,
  signatureAspect: number,
  pages: number[],
): Placement[] {
  const height = boxHeight(box, pageAspect, signatureAspect);
  return pages.map((page) => ({ page, x: box.x, y: box.y, width: box.width, height }));
}
