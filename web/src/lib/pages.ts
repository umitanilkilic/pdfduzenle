import type { Locale } from "@/i18n/config";

/** Unprefixed paths of the site's fixed (non-tool) pages in every locale. */
export const pagePaths = {
  privacy: { tr: "/gizlilik", en: "/privacy" },
} satisfies Record<string, Record<Locale, string>>;
