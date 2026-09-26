import { describe, expect, it } from "vitest";
import { hexToRgb } from "./color";

describe("hexToRgb", () => {
  it("parses long and short hex colors", () => {
    expect(hexToRgb("#ff8000")).toMatchObject({ red: 1, green: 128 / 255, blue: 0 });
    expect(hexToRgb("#fff")).toMatchObject({ red: 1, green: 1, blue: 1 });
  });

  it("falls back to black for invalid input", () => {
    expect(hexToRgb("red")).toMatchObject({ red: 0, green: 0, blue: 0 });
  });
});
