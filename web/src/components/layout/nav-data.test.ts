import { describe, expect, it } from "vitest";
import { defaultLocale, locales } from "@/i18n/config";
import { tools } from "@/tools/registry";
import { menuGroups, pathPairs } from "./nav-data";

describe("navigation data", () => {
  it.each(locales)("lists every tool exactly once in the %s menu", (locale) => {
    const hrefs = menuGroups(locale).flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toHaveLength(tools.length);
    expect(new Set(hrefs).size).toBe(tools.length);
    if (locale !== defaultLocale) expect(hrefs.every((h) => h.startsWith(`/${locale}/`))).toBe(true);
  });

  it("pairs every page with its translation for the language switcher", () => {
    const pairs = pathPairs();
    expect(pairs).toContainEqual(expect.objectContaining({ tr: "/", en: "/" }));
    expect(pairs).toContainEqual(expect.objectContaining({ tr: "/pdf-birlestir", en: "/merge-pdf" }));
    for (const pair of pairs) expect(Object.keys(pair).sort()).toEqual([...locales].sort());
    expect(pairs).toHaveLength(tools.length + 1);
  });
});
