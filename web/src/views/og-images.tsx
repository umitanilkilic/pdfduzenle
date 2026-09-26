import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { ogCategoryColors, renderOgImage } from "@/lib/og";
import { getToolContent } from "@/tools/content";
import { findToolBySlug } from "@/tools/registry";

export function homeOgImage(locale: Locale) {
  const dict = getDictionary(locale);
  return renderOgImage({ title: dict.home.heroTitle, subtitle: dict.home.eyebrow, accent: "#e0402f" });
}

export function toolOgImage(locale: Locale, slug: string) {
  const tool = findToolBySlug(locale, slug);
  if (!tool) return homeOgImage(locale);
  const content = getToolContent(locale, tool.id);
  return renderOgImage({ title: content.h1, subtitle: content.short, accent: ogCategoryColors[tool.category] });
}
