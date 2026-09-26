import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/config";
import { getAllToolContent } from "./content";
import { categoryOrder, findToolBySlug, getTool, tools } from "./registry";

describe("tool registry", () => {
  it("has unique ids", () => {
    const ids = tools.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(locales)("has unique, URL-safe slugs in %s", (locale) => {
    const slugs = tools.map((t) => t.slug[locale]);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("only suggests existing tools as next steps, never itself", () => {
    for (const tool of tools) {
      for (const next of tool.next) {
        expect(() => getTool(next)).not.toThrow();
        expect(next).not.toBe(tool.id);
      }
    }
  });

  it("puts every tool in a listed category", () => {
    for (const tool of tools) expect(categoryOrder).toContain(tool.category);
  });

  it("resolves tools by slug", () => {
    expect(findToolBySlug("tr", "pdf-birlestir")?.id).toBe("merge");
    expect(findToolBySlug("en", "merge-pdf")?.id).toBe("merge");
    expect(findToolBySlug("en", "pdf-birlestir")).toBeUndefined();
  });
});

describe.each(locales)("tool content (%s)", (locale) => {
  const content = getAllToolContent(locale);

  it.each(tools.map((t) => t.id))("is complete for %s", (id) => {
    const c = content[id];
    expect(c.name).not.toBe("");
    expect(c.steps.length).toBeGreaterThanOrEqual(3);
    expect(c.faq.length).toBeGreaterThanOrEqual(1);
    // Search engines truncate longer snippets.
    expect(c.metaTitle.length).toBeLessThanOrEqual(70);
    expect(c.metaDescription.length).toBeGreaterThanOrEqual(70);
    expect(c.metaDescription.length).toBeLessThanOrEqual(170);
  });
});
