import { describe, expect, it } from "vitest";
import { locales, localePath } from "@/i18n/config";
import { toolPath } from "@/tools/paths";
import { tools } from "@/tools/registry";
import { llmsTxt } from "./llms";
import { pagePaths } from "./pages";
import { absoluteUrl, SOURCE_URL } from "./site";

describe("llmsTxt", () => {
  const text = llmsTxt();
  const links = [...text.matchAll(/\]\((https:[^)]+)\)/g)].map((m) => m[1]);

  it("follows the llms.txt shape: H1, then a blockquote summary, then H2 sections", () => {
    const lines = text.split("\n");
    expect(lines[0]).toMatch(/^# PDF Düzenle \(pdfduzenle\.tr\)$/);
    expect(lines[2]).toMatch(/^> \S/);
    expect(lines.filter((l) => l.startsWith("## "))).toHaveLength(locales.length + 1);
    expect(lines.filter((l) => l.startsWith("# "))).toHaveLength(1);
  });

  it("links every tool, home and fixed page in every locale exactly once", () => {
    for (const locale of locales) {
      for (const tool of tools) expect(links).toContain(absoluteUrl(toolPath(locale, tool)));
      expect(links).toContain(absoluteUrl(localePath(locale)));
      expect(links).toContain(absoluteUrl(localePath(locale, pagePaths.privacy[locale])));
    }
    expect(new Set(links).size).toBe(links.length);
    expect(links).toContain(SOURCE_URL);
  });

  it("says whether each tool uploads the file", () => {
    expect(text).toMatch(/\[PDF Birleştir\]\(https:\/\/pdfduzenle\.tr\/pdf-birlestir\): .+Tarayıcıda çalışır/);
    expect(text).toMatch(/\[Compress PDF\]\(https:\/\/pdfduzenle\.tr\/en\/compress-pdf\): .+secure server/);
  });
});
