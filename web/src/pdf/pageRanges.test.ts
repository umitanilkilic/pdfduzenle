import { describe, expect, it } from "vitest";
import { PdfToolError } from "./errors";
import { formatPageSelection, parsePageGroups, parsePageSelection } from "./pageRanges";

function codeOf(fn: () => unknown) {
  try {
    fn();
  } catch (err) {
    return (err as PdfToolError).code;
  }
  return null;
}

describe("parsePageGroups", () => {
  it.each([
    ["1-3", [[0, 1, 2]]],
    ["2", [[1]]],
    ["1-2, 4", [[0, 1], [3]]],
    [" 3 - 4 ,5", [[2, 3], [4]]],
    ["4-", [[3, 4]]],
    ["-2", [[0, 1]]],
  ])("parses %j", (input, expected) => {
    expect(parsePageGroups(input, 5)).toEqual(expected);
  });

  it.each([
    ["", "emptySelection"],
    [" , ", "emptySelection"],
    ["abc", "invalidRange"],
    ["3-1", "invalidRange"],
    ["-", "invalidRange"],
    ["0", "pageOutOfRange"],
    ["6", "pageOutOfRange"],
    ["2-9", "pageOutOfRange"],
  ])("rejects %j with %s", (input, code) => {
    expect(codeOf(() => parsePageGroups(input, 5))).toBe(code);
  });
});

describe("parsePageSelection", () => {
  it("flattens, de-duplicates and sorts", () => {
    expect(parsePageSelection("4, 1-2, 2", 5)).toEqual([0, 1, 3]);
  });
});

describe("formatPageSelection", () => {
  it("compacts consecutive pages", () => {
    expect(formatPageSelection([0, 1, 2, 4, 6, 7])).toBe("1-3, 5, 7-8");
    expect(formatPageSelection([])).toBe("");
  });

  it("round-trips with parsePageSelection", () => {
    const indices = [0, 2, 3, 4, 9];
    expect(parsePageSelection(formatPageSelection(indices), 10)).toEqual(indices);
  });
});
