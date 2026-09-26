import { describe, expect, it } from "vitest";
import { pageMetadata } from "./seo";

describe("pageMetadata", () => {
  const meta = pageMetadata({
    locale: "en",
    title: "Merge PDF",
    description: "desc",
    paths: { tr: "/pdf-birlestir", en: "/merge-pdf" },
  });

  it("sets an absolute canonical URL for the current locale", () => {
    expect(meta.alternates?.canonical).toBe("https://pdfduzenle.tr/en/merge-pdf");
  });

  it("lists every locale plus x-default as hreflang alternates", () => {
    expect(meta.alternates?.languages).toEqual({
      "tr-TR": "https://pdfduzenle.tr/pdf-birlestir",
      en: "https://pdfduzenle.tr/en/merge-pdf",
      "x-default": "https://pdfduzenle.tr/pdf-birlestir",
    });
  });
});
