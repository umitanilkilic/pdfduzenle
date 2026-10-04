"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRuntime } from "./runtime";
import { IconButton } from "./ui";

/** Previous/next buttons and "n / total" under a single-page preview; hidden for one-page documents. */
export function PagePager({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange(page: number): void;
}) {
  const { dict } = useRuntime();
  if (pageCount <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-center gap-3 text-sm">
      <IconButton label={dict.ui.previousPage} disabled={page === 0} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="size-5" aria-hidden />
      </IconButton>
      <span className="tabular-nums" data-testid="page-position">
        {page + 1} / {pageCount}
      </span>
      <IconButton label={dict.ui.nextPage} disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>
        <ChevronRight className="size-5" aria-hidden />
      </IconButton>
    </div>
  );
}
