import { describe, expect, it } from "vitest";
import { boxHeight, clampBox, placements } from "./sign-placement";

describe("signature placement", () => {
  it("keeps the signature aspect ratio on the page", () => {
    // A4 portrait (≈0.707) and a 3:1 signature, 30% of the page wide.
    const h = boxHeight({ x: 0, y: 0, width: 0.3 }, 0.707, 3);
    expect(h).toBeCloseTo((0.3 * 0.707) / 3);
  });

  it("clamps the box inside the page", () => {
    expect(clampBox({ x: 0.9, y: -0.2, width: 0.3 }, 0.1)).toEqual({ x: 0.7, y: 0, width: 0.3 });
    expect(clampBox({ x: 0.5, y: 0.99, width: 2 }, 0.1)).toEqual({ x: 0, y: 0.9, width: 1 });
  });

  it("creates one placement per page", () => {
    const result = placements({ x: 0.1, y: 0.2, width: 0.4 }, 1, 2, [0, 2]);
    expect(result).toEqual([
      { page: 0, x: 0.1, y: 0.2, width: 0.4, height: 0.2 },
      { page: 2, x: 0.1, y: 0.2, width: 0.4, height: 0.2 },
    ]);
  });
});
