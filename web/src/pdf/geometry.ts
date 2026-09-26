import type { PDFPage } from "pdf-lib";

export type Rotation = 0 | 90 | 180 | 270;

/** How a page looks on screen: size after /Rotate, and a mapper back to PDF user space. */
export interface VisualFrame {
  width: number;
  height: number;
  rotation: Rotation;
  /** Maps a visual point (origin bottom-left, as seen on screen) to page coordinates. */
  toPage(x: number, y: number): { x: number; y: number };
}

export function normalizeRotation(angle: number): Rotation {
  return ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) as Rotation;
}

/**
 * Builds the visual frame of a box with the given size and rotation.
 * Anything drawn at `toPage(p)` and rotated by `rotation` degrees (counter-clockwise, as pdf-lib does)
 * appears upright at `p` on screen.
 */
export function visualFrame(box: { x: number; y: number; width: number; height: number }, angle: number): VisualFrame {
  const rotation = normalizeRotation(angle);
  const { x: ox, y: oy, width: w, height: h } = box;
  const swap = rotation === 90 || rotation === 270;
  const map: Record<Rotation, (x: number, y: number) => { x: number; y: number }> = {
    0: (x, y) => ({ x: ox + x, y: oy + y }),
    90: (x, y) => ({ x: ox + w - y, y: oy + x }),
    180: (x, y) => ({ x: ox + w - x, y: oy + h - y }),
    270: (x, y) => ({ x: ox + y, y: oy + h - x }),
  };
  return { width: swap ? h : w, height: swap ? w : h, rotation, toPage: map[rotation] };
}

export function pageFrame(page: PDFPage): VisualFrame {
  return visualFrame(page.getCropBox(), page.getRotation().angle);
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Converts margins given for the visual sides into margins for the unrotated page sides. */
export function visualToPageMargins(m: Margins, rotation: Rotation): Margins {
  switch (rotation) {
    case 0:
      return m;
    case 90:
      return { top: m.right, right: m.bottom, bottom: m.left, left: m.top };
    case 180:
      return { top: m.bottom, right: m.left, bottom: m.top, left: m.right };
    case 270:
      return { top: m.left, right: m.top, bottom: m.right, left: m.bottom };
  }
}

export const MM_TO_PT = 72 / 25.4;
