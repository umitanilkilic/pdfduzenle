import { PdfToolError } from "./errors";

/**
 * Parses a page selection such as "1-3, 5, 8-" into groups of 0-based page indices.
 * Each comma-separated part becomes one group; open ranges ("8-") run to the last page.
 */
export function parsePageGroups(input: string, pageCount: number): number[][] {
  const parts = input
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) throw new PdfToolError("emptySelection");

  return parts.map((part) => {
    const match = /^(\d+)?\s*(?:(-)\s*(\d+)?)?$/.exec(part);
    if (!match || (!match[1] && !match[3])) throw new PdfToolError("invalidRange", part);
    const start = match[1] ? Number(match[1]) : 1;
    const end = match[2] ? (match[3] ? Number(match[3]) : pageCount) : start;
    if (start < 1 || end < 1 || start > pageCount || end > pageCount) throw new PdfToolError("pageOutOfRange", part);
    if (start > end) throw new PdfToolError("invalidRange", part);
    return Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
  });
}

/** Parses a selection into a flat, de-duplicated, ascending list of 0-based indices. */
export function parsePageSelection(input: string, pageCount: number): number[] {
  const unique = new Set(parsePageGroups(input, pageCount).flat());
  return [...unique].sort((a, b) => a - b);
}

/** Formats 0-based indices back into a compact 1-based selection string, e.g. "1-3, 5". */
export function formatPageSelection(indices: number[]): string {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    parts.push(start === sorted[i] ? `${start + 1}` : `${start + 1}-${sorted[i] + 1}`);
  }
  return parts.join(", ");
}

/** Groups for "one file per page". */
export function everyPageGroups(count: number): number[][] {
  return Array.from({ length: count }, (_, i) => [i]);
}

/** Groups for "a new file every n pages". */
export function chunkGroups(count: number, size: number): number[][] {
  if (!Number.isInteger(size) || size < 1) throw new PdfToolError("invalidRange");
  const groups: number[][] = [];
  for (let start = 0; start < count; start += size) {
    groups.push(Array.from({ length: Math.min(size, count - start) }, (_, i) => start + i));
  }
  return groups;
}
