import { describe, expect, it } from "vitest";
import { htmlLang, locales } from "@/i18n/config";
import { pagePaths } from "@/lib/pages";
import { tools } from "@/tools/registry";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const entries = sitemap();

  it("contains the home page, every tool and every fixed page in every locale", () => {
    expect(entries).toHaveLength((tools.length + 1 + Object.keys(pagePaths).length) * locales.length);
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://pdfduzenle.tr");
    expect(urls).toContain("https://pdfduzenle.tr/en");
    expect(urls).toContain("https://pdfduzenle.tr/pdf-birlestir");
    expect(urls).toContain("https://pdfduzenle.tr/en/merge-pdf");
    expect(urls).toContain("https://pdfduzenle.tr/gizlilik");
    expect(urls).toContain("https://pdfduzenle.tr/en/privacy");
  });

  it("links language alternates on every entry", () => {
    for (const entry of entries)
      expect(Object.keys(entry.alternates?.languages ?? {})).toEqual(locales.map((l) => htmlLang[l]));
  });
});
