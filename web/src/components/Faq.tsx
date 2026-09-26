import { ChevronDown } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-border border-border bg-surface divide-y rounded-2xl border">
      {items.map((item) => (
        <details key={item.q} className="group px-5">
          <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 font-medium">
            {item.q}
            <ChevronDown className="text-muted size-5 shrink-0 transition group-open:rotate-180" aria-hidden />
          </summary>
          <p className="text-muted pb-5 leading-relaxed">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
