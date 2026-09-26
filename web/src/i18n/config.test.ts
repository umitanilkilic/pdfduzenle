import { describe, expect, it } from "vitest";
import { isLocale, localePath, locales, localeNames, perLocale, stripLocale } from "./config";

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
    expect(isLocale("xx")).toBe(false);
  });
});

describe("stripLocale", () => {
  it("removes the locale prefix and keeps default-locale paths", () => {
    expect(stripLocale("/en/merge-pdf", "en")).toBe("/merge-pdf");
    expect(stripLocale("/en", "en")).toBe("/");
    expect(stripLocale("/pdf-birlestir", "tr")).toBe("/pdf-birlestir");
  });

  it("round-trips with localePath for every locale", () => {
    for (const l of locales) expect(stripLocale(localePath(l, "/a-tool"), l)).toBe("/a-tool");
  });
});

describe("localeNames", () => {
  it("names every locale", () => {
    for (const l of locales) expect(localeNames[l]).toBeTruthy();
  });
});

describe("perLocale", () => {
  it("has a value for every locale", () => {
    expect(Object.keys(perLocale((l) => l)).sort()).toEqual([...locales].sort());
  });
});
