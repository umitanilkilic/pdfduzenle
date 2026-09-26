import { describe, expect, it } from "vitest";
import { normalizeRotation, visualFrame, visualToPageMargins } from "./geometry";

const box = { x: 0, y: 0, width: 200, height: 100 };

describe("visualFrame", () => {
  it("is the identity without rotation", () => {
    const f = visualFrame(box, 0);
    expect([f.width, f.height]).toEqual([200, 100]);
    expect(f.toPage(10, 20)).toEqual({ x: 10, y: 20 });
  });

  it.each([
    // [rotation, visual size, visual bottom-left → page, visual top-right → page]
    [90, [100, 200], { x: 200, y: 0 }, { x: 0, y: 100 }],
    [180, [200, 100], { x: 200, y: 100 }, { x: 0, y: 0 }],
    [270, [100, 200], { x: 0, y: 100 }, { x: 200, y: 0 }],
  ] as const)("maps corners for %i°", (rotation, size, bottomLeft, topRight) => {
    const f = visualFrame(box, rotation);
    expect([f.width, f.height]).toEqual(size);
    expect(f.toPage(0, 0)).toEqual(bottomLeft);
    expect(f.toPage(f.width, f.height)).toEqual(topRight);
  });

  it("respects the box origin", () => {
    expect(visualFrame({ x: 5, y: 7, width: 10, height: 10 }, 0).toPage(1, 1)).toEqual({ x: 6, y: 8 });
  });
});

describe("normalizeRotation", () => {
  it.each([
    [0, 0],
    [360, 0],
    [-90, 270],
    [450, 90],
  ])("%i → %i", (input, expected) => expect(normalizeRotation(input)).toBe(expected));
});

describe("visualToPageMargins", () => {
  const m = { top: 1, right: 2, bottom: 3, left: 4 };
  it("rotates margins with the page", () => {
    expect(visualToPageMargins(m, 0)).toEqual(m);
    expect(visualToPageMargins(m, 90)).toEqual({ top: 2, right: 3, bottom: 4, left: 1 });
    expect(visualToPageMargins(m, 180)).toEqual({ top: 3, right: 4, bottom: 1, left: 2 });
    expect(visualToPageMargins(m, 270)).toEqual({ top: 4, right: 1, bottom: 2, left: 3 });
  });
});
