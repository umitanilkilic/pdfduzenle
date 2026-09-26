import { describe, expect, it } from "vitest";
import { formatPageLabel, pageLabel } from "./pageLabels";

describe("formatPageLabel", () => {
  it("fills every placeholder", () => {
    expect(formatPageLabel("Sayfa {n} / {total} ({n})", 3, 9)).toBe("Sayfa 3 / 9 (3)");
  });
});

describe("pageLabel", () => {
  const opts = { template: "{n}/{total}", start: 1, firstPage: 0 };

  it("numbers pages from start", () => {
    expect(pageLabel(0, 3, opts)).toBe("1/3");
    expect(pageLabel(2, 3, { ...opts, start: 5 })).toBe("7/7");
  });

  it("skips pages before firstPage and counts only numbered pages", () => {
    expect(pageLabel(0, 3, { ...opts, firstPage: 1 })).toBeNull();
    expect(pageLabel(1, 3, { ...opts, firstPage: 1 })).toBe("1/2");
  });

  it("returns null outside the document", () => {
    expect(pageLabel(3, 3, opts)).toBeNull();
  });
});
