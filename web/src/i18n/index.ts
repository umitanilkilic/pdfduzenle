import type { Locale } from "./config";
import { en } from "./dictionaries/en";
import { tr, type Dictionary } from "./dictionaries/tr";

const dictionaries: Record<Locale, Dictionary> = { tr, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };

/** Replaces `{name}` placeholders in a message. */
export function format(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}
