import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getAllToolContent } from "@/tools/content";
import { toolPath } from "@/tools/paths";
import { categoryOrder, tools, toolsInCategory } from "@/tools/registry";
import type { PathPair } from "./LanguageSwitcher";
import type { MenuGroup } from "./ToolsMenu";

export function menuGroups(locale: Locale): MenuGroup[] {
  const dict = getDictionary(locale);
  const content = getAllToolContent(locale);
  return categoryOrder.map((category) => ({
    category,
    name: dict.categories[category].name,
    items: toolsInCategory(category).map((tool) => ({
      href: toolPath(locale, tool),
      name: content[tool.id].name,
      icon: tool.icon,
    })),
  }));
}

export function pathPairs(): PathPair[] {
  return [{ tr: "/", en: "/" }, ...tools.map((tool) => ({ tr: `/${tool.slug.tr}`, en: `/${tool.slug.en}` }))];
}
