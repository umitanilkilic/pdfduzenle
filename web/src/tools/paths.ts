import { localePath, type Locale } from "@/i18n/config";
import type { ToolDefinition } from "./registry";

export function toolPath(locale: Locale, tool: ToolDefinition): string {
  return localePath(locale, `/${tool.slug[locale]}`);
}

export function toolPaths(tool: ToolDefinition): Record<Locale, string> {
  return { tr: `/${tool.slug.tr}`, en: `/${tool.slug.en}` };
}
