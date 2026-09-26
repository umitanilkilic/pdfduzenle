"use client";

import { format } from "@/i18n";
import { PageThumb } from "./PageThumb";
import { useRuntime } from "./runtime";
import type { PdfPreview } from "./usePdfDocument";

/** Read-only overview of every page; scrolls inside its box so long documents don't bury the options. */
export function PageGrid({ preview }: { preview: PdfPreview }) {
  const { dict } = useRuntime();
  return (
    <ul
      data-testid="page-grid"
      className="grid max-h-[36rem] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4"
    >
      {Array.from({ length: preview.doc.pageCount }, (_, i) => (
        <li key={i} className="bg-surface rounded-xl p-2">
          <PageThumb thumbs={preview.thumbs} index={i} alt={format(dict.ui.page, { n: i + 1 })} />
          <span className="text-muted mt-1 block text-center text-xs">{i + 1}</span>
        </li>
      ))}
    </ul>
  );
}
