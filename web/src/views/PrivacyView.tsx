import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { pagePaths } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { SOURCE_URL } from "@/lib/site";

export function privacyMetadata(locale: Locale): Metadata {
  const { privacy } = getDictionary(locale);
  return pageMetadata({
    locale,
    title: privacy.title,
    description: privacy.description,
    paths: pagePaths.privacy,
  });
}

export function PrivacyView({ locale }: { locale: Locale }) {
  const { privacy } = getDictionary(locale);
  return (
    <article className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{privacy.title}</h1>
      <p className="text-muted mt-2 text-sm">{privacy.updated}</p>
      {privacy.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="text-xl font-bold">{section.heading}</h2>
          {section.paragraphs.map((p) => (
            <p key={p} className="text-muted mt-3 leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}
      <p className="mt-10">
        <a href={SOURCE_URL} className="text-brand font-medium underline-offset-2 hover:underline" rel="noopener">
          {SOURCE_URL.replace("https://", "")}
        </a>
      </p>
    </article>
  );
}
