import { describe, expect, it } from "vitest";
import { isLocale, localePath } from "./config";

describe("localePath", () => {
  it("keeps Turkish paths at the root", () => {
    expect(localePath("tr")).toBe("/");
    expect(localePath("tr", "/pdf-birlestir")).toBe("/pdf-birlestir");
  });

  it("prefixes English paths with /en", () => {
    expect(localePath("en")).toBe("/en");
    expect(localePath("en", "/merge-pdf")).toBe("/en/merge-pdf");
  });

  it("accepts paths without a leading slash", () => {
    expect(localePath("en", "merge-pdf")).toBe("/en/merge-pdf");
  });
});

describe("isLocale", () => {
  it("accepts supported locales only", () => {
    expect(isLocale("tr")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });
});
