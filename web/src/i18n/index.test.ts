import { describe, expect, it } from "vitest";
import { format, getDictionary } from ".";

describe("format", () => {
  it("replaces named placeholders", () => {
    expect(format("{percent} smaller", { percent: "40%" })).toBe("40% smaller");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(format("{a} {b}", { a: 1 })).toBe("1 {b}");
  });
});

describe("dictionaries", () => {
  it("have the same FAQ and trust item counts in every locale", () => {
    const tr = getDictionary("tr");
    const en = getDictionary("en");
    expect(en.home.faq).toHaveLength(tr.home.faq.length);
    expect(en.home.trust).toHaveLength(tr.home.trust.length);
  });
});
