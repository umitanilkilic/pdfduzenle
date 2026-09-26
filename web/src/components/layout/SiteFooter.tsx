import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { Logo } from "./Logo";
import { menuGroups } from "./nav-data";

export function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const groups = menuGroups(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="border-border bg-surface mt-24 border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.2fr_3fr]">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted max-w-xs text-sm">{dict.footer.tagline}</p>
          <ul className="text-muted flex gap-4 pt-2 text-sm">
            <li>
              <a href="https://ipsorgu.tr" className="hover:text-fg" rel="noopener">
                ipsorgu.tr
              </a>
            </li>
            <li>
              <a href="https://linkedin.com/in/umitanilkilic" className="hover:text-fg" rel="noopener me">
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
        <nav aria-label={dict.footer.tools} className="grid gap-8 sm:grid-cols-3">
          {groups.map((group) => (
            <div key={group.category}>
              <p className="mb-3 text-sm font-semibold">{group.name}</p>
              <ul className="text-muted space-y-2 text-sm">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="hover:text-fg">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-border text-muted border-t py-5 text-center text-xs">
        © {year} pdfduzenle.tr · {dict.footer.rights}
      </div>
    </footer>
  );
}
