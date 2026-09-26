import type { MetadataRoute } from "next";
import { defaultLocale, htmlLang, localePath, locales, perLocale, type Locale } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";
import { toolPaths } from "@/tools/paths";
import { tools } from "@/tools/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { paths: Record<Locale, string>; priority: number }[] = [
    { paths: perLocale(() => "/"), priority: 1 },
    ...tools.map((tool) => ({ paths: toolPaths(tool), priority: 0.8 })),
  ];

  return pages.flatMap(({ paths, priority }) => {
    const languages = Object.fromEntries(locales.map((l) => [htmlLang[l], absoluteUrl(localePath(l, paths[l]))]));
    return locales.map((locale) => ({
      url: absoluteUrl(localePath(locale, paths[locale])),
      changeFrequency: "monthly" as const,
      priority: locale === defaultLocale ? priority : priority - 0.1,
      alternates: { languages },
    }));
  });
}
