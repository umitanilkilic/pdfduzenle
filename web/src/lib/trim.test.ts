import { describe, expect, it } from "vitest";
import { opaqueBounds } from "./trim";

function image(width: number, height: number, opaque: [number, number][]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of opaque) data[(y * width + x) * 4 + 3] = 255;
  return data;
}

describe("opaqueBounds", () => {
  it("returns the box around opaque pixels", () => {
    expect(
      opaqueBounds(
        image(10, 10, [
          [2, 3],
          [7, 5],
        ]),
        10,
        10,
      ),
    ).toEqual({ x: 2, y: 3, width: 6, height: 3 });
  });

  it("returns null for a blank canvas", () => {
    expect(opaqueBounds(image(4, 4, []), 4, 4)).toBeNull();
  });
});
