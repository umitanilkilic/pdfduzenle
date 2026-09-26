import type { MetadataRoute } from "next";
import { htmlLang, localePath, locales } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";
import { toolPaths } from "@/tools/paths";
import { tools } from "@/tools/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { paths: Record<(typeof locales)[number], string>; priority: number }[] = [
    { paths: { tr: "/", en: "/" }, priority: 1 },
    ...tools.map((tool) => ({ paths: toolPaths(tool), priority: 0.8 })),
  ];

  return pages.flatMap(({ paths, priority }) => {
    const languages = Object.fromEntries(locales.map((l) => [htmlLang[l], absoluteUrl(localePath(l, paths[l]))]));
    return locales.map((locale) => ({
      url: absoluteUrl(localePath(locale, paths[locale])),
      changeFrequency: "monthly" as const,
      priority: locale === "tr" ? priority : priority - 0.1,
      alternates: { languages },
    }));
  });
}
