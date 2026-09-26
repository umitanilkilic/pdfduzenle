import { localePath, perLocale, type Locale } from "@/i18n/config";
import type { ToolDefinition } from "./registry";

export function toolPath(locale: Locale, tool: ToolDefinition): string {
  return localePath(locale, `/${tool.slug[locale]}`);
}

export function toolPaths(tool: ToolDefinition): Record<Locale, string> {
  return perLocale((l) => `/${tool.slug[l]}`);
}
