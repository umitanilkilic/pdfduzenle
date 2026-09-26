import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { menuGroups, pathPairs } from "./nav-data";
import { ThemeToggle } from "./ThemeToggle";
import { ToolsMenu } from "./ToolsMenu";

export function SiteHeader({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <header className="border-border bg-surface/85 sticky top-0 z-40 h-16 border-b backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-4">
        <Link href={localePath(locale)} aria-label="PDF Düzenle" className="mr-2 shrink-0">
          <Logo compact />
        </Link>
        <nav className="flex flex-1 items-center">
          <ToolsMenu label={dict.nav.allTools} groups={menuGroups(locale)} />
        </nav>
        <LanguageSwitcher locale={locale} pairs={pathPairs()} label={dict.nav.language} />
        <ThemeToggle label={dict.nav.theme} />
      </div>
    </header>
  );
}
