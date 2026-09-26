import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { themeInitScript } from "@/components/layout/ThemeToggle";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { htmlLang, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { WorkspaceProvider } from "@/workspace/context";
import "../app/globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export function rootMetadata(locale: Locale): Metadata {
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: dict.meta.homeTitle, template: `%s | ${dict.meta.titleSuffix}` },
    description: dict.meta.homeDescription,
    applicationName: SITE_NAME,
    formatDetection: { telephone: false },
  };
}

export const rootViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1c24" },
  ],
};

export function RootLayout({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const dict = getDictionary(locale);
  return (
    <html lang={htmlLang[locale]} className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        {/* Runs before first paint so the saved theme applies without a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <a
          href="#main"
          className="focus:bg-surface sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2"
        >
          {dict.nav.skipToContent}
        </a>
        <WorkspaceProvider>
          <SiteHeader locale={locale} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter locale={locale} />
        </WorkspaceProvider>
      </body>
    </html>
  );
}
