import { describe, expect, it } from "vitest";
import { locales, perLocale } from "@/i18n/config";
import { pageMetadata } from "./seo";

describe("pageMetadata", () => {
  const meta = pageMetadata({
    locale: "en",
    title: "Merge PDF",
    description: "desc",
    // Any further locale gets a placeholder path, so adding a language doesn't require editing this test.
    paths: { ...perLocale((l) => `/${l}-merge`), tr: "/pdf-birlestir", en: "/merge-pdf" },
  });

  it("sets an absolute canonical URL for the current locale", () => {
    expect(meta.alternates?.canonical).toBe("https://pdfduzenle.tr/en/merge-pdf");
  });

  it("lists every locale plus x-default as hreflang alternates", () => {
    const languages = meta.alternates?.languages ?? {};
    expect(languages).toMatchObject({
      "tr-TR": "https://pdfduzenle.tr/pdf-birlestir",
      en: "https://pdfduzenle.tr/en/merge-pdf",
      "x-default": "https://pdfduzenle.tr/pdf-birlestir",
    });
    expect(Object.keys(languages)).toHaveLength(locales.length + 1);
  });
});
