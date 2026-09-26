import { ChevronRight, HardDrive, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq, faqJsonLd } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { ToolIcon } from "@/components/ToolIcon";
import { ToolWorkspace } from "@/components/tool/ToolWorkspace";
import { getDictionary } from "@/i18n";
import { localePath, type Locale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { getToolContent } from "@/tools/content";
import { toolPath, toolPaths } from "@/tools/paths";
import { findToolBySlug, getTool, tools, toolsInCategory, type ToolDefinition } from "@/tools/registry";

export function toolStaticParams(locale: Locale) {
  return tools.map((tool) => ({ tool: tool.slug[locale] }));
}

function resolve(locale: Locale, slug: string): ToolDefinition {
  const tool = findToolBySlug(locale, slug);
  if (!tool) notFound();
  return tool;
}

export function toolMetadata(locale: Locale, slug: string): Metadata {
  const tool = resolve(locale, slug);
  const content = getToolContent(locale, tool.id);
  return pageMetadata({
    locale,
    title: content.metaTitle,
    description: content.metaDescription,
    paths: toolPaths(tool),
  });
}

/** Next-step tools first, then the rest of the category, without duplicates. */
function relatedTools(tool: ToolDefinition): ToolDefinition[] {
  const ids = new Set([...tool.next, ...toolsInCategory(tool.category).map((t) => t.id)]);
  ids.delete(tool.id);
  return [...ids].slice(0, 8).map(getTool);
}

export function ToolView({ locale, slug }: { locale: Locale; slug: string }) {
  const tool = resolve(locale, slug);
  const dict = getDictionary(locale);
  const content = getToolContent(locale, tool.id);
  const url = absoluteUrl(toolPath(locale, tool));
  const related = relatedTools(tool);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: dict.tool.home, item: absoluteUrl(localePath(locale)) },
                { "@type": "ListItem", position: 2, name: content.name, item: url },
              ],
            },
            {
              "@type": "WebApplication",
              name: `${content.name} – ${SITE_NAME}`,
              url,
              description: content.metaDescription,
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Any",
              browserRequirements: "Requires JavaScript",
              inLanguage: locale,
              offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
            },
            {
              "@type": "HowTo",
              name: content.h1,
              step: content.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
            },
            faqJsonLd(content.faq),
          ],
        }}
      />

      <div className="mx-auto max-w-5xl px-4 pt-6">
        <nav aria-label="Breadcrumb" className="text-muted flex items-center gap-1 text-sm">
          <Link href={localePath(locale)} className="hover:text-fg">
            {dict.tool.home}
          </Link>
          <ChevronRight className="size-4" aria-hidden />
          <span className="text-fg">{content.name}</span>
        </nav>

        <header className="mt-8 text-center">
          <span
            className="mx-auto grid size-14 place-items-center rounded-2xl text-white shadow-lg shadow-black/10"
            style={{ background: `var(--cat-${tool.category})` }}
          >
            <ToolIcon name={tool.icon} className="size-7" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">{content.h1}</h1>
          <p className="text-muted mx-auto mt-4 max-w-2xl text-lg text-pretty">{content.lead}</p>
          <p className="bg-surface-2 text-muted mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            {tool.runtime === "browser" ? (
              <HardDrive className="text-ok size-3.5" aria-hidden />
            ) : (
              <ShieldCheck className="text-ok size-3.5" aria-hidden />
            )}
            {tool.runtime === "browser" ? dict.tool.runsInBrowser : dict.tool.runsOnServer}
          </p>
        </header>

        {/* Clarity (after consent) never records file names or tool fields. */}
        <section className="mt-10" data-clarity-mask="true">
          <ToolWorkspace locale={locale} toolId={tool.id} />
        </section>
      </div>

      <div className="mx-auto mt-24 grid max-w-5xl gap-16 px-4 lg:grid-cols-2">
        <section>
          <h2 className="text-2xl font-bold tracking-tight">{dict.tool.stepsTitle}</h2>
          <ol className="mt-6 space-y-4">
            {content.steps.map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="bg-brand-soft text-brand grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold">
                  {i + 1}
                </span>
                <p className="pt-1 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="text-2xl font-bold tracking-tight">{dict.tool.faqTitle}</h2>
          <div className="mt-6">
            <Faq items={content.faq} />
          </div>
        </section>
      </div>

      <section className="mx-auto mt-24 max-w-5xl px-4">
        <h2 className="text-2xl font-bold tracking-tight">{dict.tool.relatedTitle}</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((other) => {
            const c = getToolContent(locale, other.id);
            return (
              <li key={other.id}>
                <Link
                  href={toolPath(locale, other)}
                  className="border-border bg-surface flex items-center gap-3 rounded-xl border p-3 transition hover:shadow-md"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-white"
                    style={{ background: `var(--cat-${other.category})` }}
                  >
                    <ToolIcon name={other.icon} className="size-4.5" />
                  </span>
                  <span className="text-sm font-medium">{c.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
