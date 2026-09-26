import { HardDrive, Link2, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { Faq, faqJsonLd } from "@/components/Faq";
import { ToolGrid, type GridItem } from "@/components/home/ToolGrid";
import { JsonLd } from "@/components/JsonLd";
import { getDictionary } from "@/i18n";
import { localePath, perLocale, type Locale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { getAllToolContent } from "@/tools/content";
import { toolPath } from "@/tools/paths";
import { categoryOrder, tools } from "@/tools/registry";

const trustIcons = [HardDrive, ShieldCheck, Sparkles, Link2];

export function homeMetadata(locale: Locale): Metadata {
  const dict = getDictionary(locale);
  const meta = pageMetadata({
    locale,
    title: dict.meta.homeTitle,
    description: dict.meta.homeDescription,
    paths: perLocale(() => "/"),
  });
  // The home title already contains the brand; skip the layout template.
  return { ...meta, title: { absolute: dict.meta.homeTitle } };
}

export function HomeView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const content = getAllToolContent(locale);

  const items: GridItem[] = tools.map((tool) => ({
    id: tool.id,
    href: toolPath(locale, tool),
    name: content[tool.id].name,
    short: content[tool.id].short,
    icon: tool.icon,
    category: tool.category,
    keywords: content[tool.id].keywords,
  }));

  const homeUrl = absoluteUrl(localePath(locale));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${absoluteUrl("/")}#website`,
              name: SITE_NAME,
              url: homeUrl,
              inLanguage: locale,
              publisher: { "@id": `${absoluteUrl("/")}#organization` },
            },
            {
              "@type": "Organization",
              "@id": `${absoluteUrl("/")}#organization`,
              name: SITE_NAME,
              url: absoluteUrl("/"),
              logo: absoluteUrl("/icon.svg"),
            },
            faqJsonLd(dict.home.faq),
          ],
        }}
      />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[32rem] bg-[radial-gradient(50%_60%_at_50%_30%,var(--brand-soft),transparent)]"
        />
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-10 text-center sm:pt-24">
          <p className="border-border bg-surface text-muted mb-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold">
            {dict.home.eyebrow}
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">
            {dict.home.heroTitle}
          </h1>
          <p className="text-muted mx-auto mt-5 max-w-2xl text-lg text-pretty">{dict.home.heroSubtitle}</p>
        </div>
      </section>

      <section aria-labelledby="tools-title" className="mx-auto max-w-6xl px-4">
        <h2 id="tools-title" className="sr-only">
          {dict.home.toolsTitle}
        </h2>
        <ToolGrid
          items={items}
          categories={categoryOrder.map((id) => ({ id, name: dict.categories[id].name }))}
          allLabel={dict.nav.allTools}
          placeholder={dict.home.searchPlaceholder}
          emptyLabel={dict.home.searchEmpty}
        />
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight">{dict.home.trustTitle}</h2>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dict.home.trust.map((item, i) => {
            const Icon = trustIcons[i % trustIcons.length];
            return (
              <li key={item.title} className="border-border bg-surface rounded-2xl border p-6">
                <Icon className="text-brand size-6" aria-hidden />
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="text-muted mt-2 text-sm leading-relaxed">{item.text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto mt-24 max-w-3xl px-4">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">{dict.home.faqTitle}</h2>
        <Faq items={dict.home.faq} />
      </section>
    </>
  );
}
