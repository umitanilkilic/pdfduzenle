import type { Locale } from "@/i18n/config";
import type { ToolId } from "../registry";
import { enTools } from "./en";
import { trTools } from "./tr";
import type { ToolContent, ToolContentMap } from "./types";

const content: Record<Locale, ToolContentMap> = { tr: trTools, en: enTools };

export function getToolContent(locale: Locale, id: ToolId): ToolContent {
  return content[locale][id];
}

export function getAllToolContent(locale: Locale): ToolContentMap {
  return content[locale];
}

export type { ToolContent };
