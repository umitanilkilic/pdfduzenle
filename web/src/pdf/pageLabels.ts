/** Page-number labels. Pure, so both the PDF worker and the live preview use it. */
export function formatPageLabel(template: string, n: number, total: number): string {
  return template.replaceAll("{n}", String(n)).replaceAll("{total}", String(total));
}

/** Label printed on page `index` (0-based), or null for pages before `firstPage`. */
export function pageLabel(
  index: number,
  pageCount: number,
  opts: { template: string; start: number; firstPage: number },
): string | null {
  if (index < opts.firstPage || index >= pageCount) return null;
  const last = opts.start + pageCount - opts.firstPage - 1;
  return formatPageLabel(opts.template, opts.start + index - opts.firstPage, last);
}
