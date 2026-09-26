"use client";

import { Languages } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeNames, localePath, locales, stripLocale, type Locale } from "@/i18n/config";

/** Unprefixed path of one page in every locale. */
export type PathPair = Record<Locale, string>;

/** Links to the same page in the other languages, using slug pairs from the tool registry. */
export function LanguageSwitcher({ locale, pairs, label }: { locale: Locale; pairs: PathPair[]; label: string }) {
  const current = stripLocale(usePathname() ?? "/", locale);
  const pair = pairs.find((p) => p[locale] === current);

  return (
    <div className="text-muted flex items-center">
      <Languages className="size-4" aria-hidden />
      {locales
        .filter((target) => target !== locale)
        .map((target) => (
          <Link
            key={target}
            href={localePath(target, pair ? pair[target] : "/")}
            hrefLang={target}
            aria-label={`${label}: ${localeNames[target]}`}
            className="hover:bg-surface-2 hover:text-fg flex h-10 items-center rounded-full px-2 text-sm font-medium transition"
          >
            {target.toUpperCase()}
          </Link>
        ))}
    </div>
  );
}
