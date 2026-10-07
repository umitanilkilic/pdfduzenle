import { getDictionary } from "@/i18n";
import { localeNames, localePath, locales } from "@/i18n/config";
import { getAllToolContent } from "@/tools/content";
import { toolPath } from "@/tools/paths";
import { categoryOrder, toolsInCategory } from "@/tools/registry";
import { pagePaths } from "./pages";
import { absoluteUrl, SITE_NAME, SITE_URL, SOURCE_URL } from "./site";

/**
 * /llms.txt (https://llmstxt.org): a Markdown index of the site for language models, built from the tool
 * registry and content so it never goes stale. One section per locale, grouped by category.
 */
export function llmsTxt(): string {
  const lines = [`# ${SITE_NAME} (${new URL(SITE_URL).host})`, ""];
  for (const locale of locales) lines.push(`> ${getDictionary(locale).meta.homeDescription}`, ">");
  lines.pop();
  lines.push("");

  for (const locale of locales) {
    const dict = getDictionary(locale);
    const content = getAllToolContent(locale);
    lines.push(`## ${localeNames[locale]}`, "");
    lines.push(`- [${dict.meta.homeTitle}](${absoluteUrl(localePath(locale))})`);
    for (const category of categoryOrder) {
      for (const tool of toolsInCategory(category)) {
        const runtime = tool.runtime === "browser" ? dict.tool.runsInBrowser : dict.tool.runsOnServer;
        const { name, short } = content[tool.id];
        lines.push(
          `- [${name}](${absoluteUrl(toolPath(locale, tool))}): ${short} (${dict.categories[category].name}; ${runtime})`,
        );
      }
    }
    lines.push(`- [${dict.privacy.title}](${absoluteUrl(localePath(locale, pagePaths.privacy[locale]))})`, "");
  }

  lines.push("## Optional", "");
  lines.push(`- [Source code (AGPL-3.0)](${SOURCE_URL})`);
  lines.push(`- [Sitemap](${absoluteUrl("/sitemap.xml")})`, "");
  return lines.join("\n");
}
