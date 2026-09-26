import { describe, expect, it } from "vitest";
import { tools } from "@/tools/registry";
import { menuGroups, pathPairs } from "./nav-data";

describe("navigation data", () => {
  it.each(["tr", "en"] as const)("lists every tool exactly once in the %s menu", (locale) => {
    const hrefs = menuGroups(locale).flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toHaveLength(tools.length);
    expect(new Set(hrefs).size).toBe(tools.length);
    if (locale === "en") expect(hrefs.every((h) => h.startsWith("/en/"))).toBe(true);
  });

  it("pairs every page with its translation for the language switcher", () => {
    const pairs = pathPairs();
    expect(pairs).toContainEqual({ tr: "/", en: "/" });
    expect(pairs).toContainEqual({ tr: "/pdf-birlestir", en: "/merge-pdf" });
    expect(pairs).toHaveLength(tools.length + 1);
  });
});
