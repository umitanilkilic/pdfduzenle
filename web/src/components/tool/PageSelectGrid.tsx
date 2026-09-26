"use client";

import { Check, X } from "lucide-react";
import { format } from "@/i18n";
import { cn } from "@/lib/cn";
import { PageThumb } from "./PageThumb";
import { useRuntime } from "./runtime";
import type { PdfPreview } from "./usePdfDocument";

/** Grid of pages that can be toggled; `mark` decides whether selected pages look kept or removed. */
export function PageSelectGrid({
  preview,
  selected,
  onToggle,
  mark,
}: {
  preview: PdfPreview;
  selected: Set<number>;
  onToggle(index: number): void;
  mark: "keep" | "remove";
}) {
  const { dict } = useRuntime();
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: preview.doc.pageCount }, (_, i) => {
        const on = selected.has(i);
        const label = format(dict.ui.page, { n: i + 1 });
        return (
          <li key={i}>
            <button
              type="button"
              aria-pressed={on}
              aria-label={label}
              onClick={() => onToggle(i)}
              className={cn(
                "bg-surface relative w-full rounded-xl border-2 p-2 text-left transition",
                on ? (mark === "remove" ? "border-danger" : "border-brand") : "hover:border-border border-transparent",
              )}
            >
              <div className={cn(on && mark === "remove" && "opacity-40")}>
                <PageThumb thumbs={preview.thumbs} index={i} alt={label} />
              </div>
              {on && (
                <span
                  className={cn(
                    "absolute top-3 right-3 grid size-7 place-items-center rounded-full text-white shadow",
                    mark === "remove" ? "bg-danger" : "bg-brand",
                  )}
                >
                  {mark === "remove" ? <X className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
                </span>
              )}
              <span className="text-muted mt-1 block text-center text-xs">{i + 1}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
