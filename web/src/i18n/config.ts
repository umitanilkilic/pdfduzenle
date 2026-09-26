export const locales = ["tr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "tr";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Public URL path for a locale. Turkish lives at the root, other locales under a prefix. */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

export const htmlLang: Record<Locale, string> = { tr: "tr-TR", en: "en" };
export const ogLocale: Record<Locale, string> = { tr: "tr_TR", en: "en_US" };

/** Builds a value for every locale, so adding a locale can't leave one out. */
export function perLocale<T>(value: (locale: Locale) => T): Record<Locale, T> {
  return Object.fromEntries(locales.map((l) => [l, value(l)])) as Record<Locale, T>;
}

/** Language names in their own language, for the language switcher. */
export const localeNames: Record<Locale, string> = { tr: "Türkçe", en: "English" };

/** The unprefixed path of a URL path in `locale`, e.g. ("/en/merge-pdf", "en") → "/merge-pdf". */
export function stripLocale(pathname: string, locale: Locale): string {
  if (locale === defaultLocale) return pathname;
  if (pathname === `/${locale}`) return "/";
  return pathname.startsWith(`/${locale}/`) ? pathname.slice(locale.length + 1) : pathname;
}
