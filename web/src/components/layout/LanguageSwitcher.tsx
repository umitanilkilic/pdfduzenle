"use client";

import { Languages } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { localePath, type Locale } from "@/i18n/config";

export interface PathPair {
  tr: string;
  en: string;
}

const labels: Record<Locale, string> = { tr: "Türkçe", en: "English" };

/** Links to the same page in the other language, using slug pairs from the tool registry. */
export function LanguageSwitcher({ locale, pairs, label }: { locale: Locale; pairs: PathPair[]; label: string }) {
  const pathname = usePathname() ?? "/";
  const target: Locale = locale === "tr" ? "en" : "tr";

  // Normalise to the unprefixed path of the current locale.
  let current = pathname;
  if (current === `/${locale}` || current.startsWith(`/${locale}/`)) current = current.slice(locale.length + 1) || "/";

  const pair = pairs.find((p) => p[locale] === current);
  const href = localePath(target, pair ? pair[target] : "/");

  return (
    <Link
      href={href}
      hrefLang={target}
      aria-label={`${label}: ${labels[target]}`}
      className="text-muted hover:bg-surface-2 hover:text-fg flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition"
    >
      <Languages className="size-4" aria-hidden />
      {target.toUpperCase()}
    </Link>
  );
}
