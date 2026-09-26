import { matchesAccept } from "@/lib/files";

export interface ToolLink {
  id: string;
  name: string;
  href: string;
  accept: string;
}

/** Tools that accept the given file, excluding the one that produced it. */
export function compatibleTools<T extends ToolLink>(
  file: { name: string; type: string; toolId?: string },
  tools: T[],
): T[] {
  return tools.filter((t) => t.id !== file.toolId && matchesAccept(file, t.accept));
}

/** "3 dakika önce" / "3 minutes ago". */
export function timeAgo(then: number, now: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.round((then - now) / 60_000);
  if (minutes === 0) return rtf.format(0, "second");
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  return rtf.format(Math.round(minutes / 60), "hour");
}
