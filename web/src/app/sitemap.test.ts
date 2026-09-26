import { describe, expect, it } from "vitest";
import { tools } from "@/tools/registry";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const entries = sitemap();

  it("contains the home page and every tool in both locales", () => {
    expect(entries).toHaveLength((tools.length + 1) * 2);
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://pdfduzenle.tr");
    expect(urls).toContain("https://pdfduzenle.tr/en");
    expect(urls).toContain("https://pdfduzenle.tr/pdf-birlestir");
    expect(urls).toContain("https://pdfduzenle.tr/en/merge-pdf");
  });

  it("links language alternates on every entry", () => {
    for (const entry of entries) expect(Object.keys(entry.alternates?.languages ?? {})).toEqual(["tr-TR", "en"]);
  });
});
