import type { Metadata } from "next";
import { defaultLocale, htmlLang, locales, localePath, ogLocale, type Locale } from "@/i18n/config";
import { absoluteUrl, SITE_NAME } from "./site";

interface PageMetaInput {
  locale: Locale;
  title: string;
  description: string;
  /** Unprefixed path of this page in every locale, e.g. { tr: "/pdf-birlestir", en: "/merge-pdf" }. */
  paths: Record<Locale, string>;
}

/** Builds title, description, canonical, hreflang alternates and social cards for a page. */
export function pageMetadata({ locale, title, description, paths }: PageMetaInput): Metadata {
  const url = absoluteUrl(localePath(locale, paths[locale]));
  const languages: Record<string, string> = {};
  for (const l of locales) languages[htmlLang[l]] = absoluteUrl(localePath(l, paths[l]));
  languages["x-default"] = absoluteUrl(localePath(defaultLocale, paths[defaultLocale]));

  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: ogLocale[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => ogLocale[l]),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
