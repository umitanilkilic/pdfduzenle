import type { Locale } from "@/i18n/config";

export async function readBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** File name without its extension. */
export function baseName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/** Makes a safe, readable download name: "rapor-birlestirilmis.pdf", "rapor-bolum-2.pdf". */
export function outputName(original: string, suffix: string, ext: string, index?: number): string {
  const base =
    baseName(original)
      .normalize("NFC")
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "belge";
  return `${base}-${suffix}${index === undefined ? "" : `-${index}`}.${ext}`;
}

export function formatBytes(bytes: number, locale: Locale): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: digits })} ${units[unit]}`;
}

/** Whether a file matches an `accept` attribute value such as "application/pdf,.pdf". */
export function matchesAccept(file: { name: string; type: string }, accept: string): boolean {
  const name = file.name.toLowerCase();
  return accept
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .some((a) =>
      a.startsWith(".") ? name.endsWith(a) : a.endsWith("/*") ? file.type.startsWith(a.slice(0, -1)) : file.type === a,
    );
}

/** Size reduction as a whole percentage, or null when the output is not smaller. */
export function savedPercent(originalSize: number, newSize: number): number | null {
  if (originalSize <= 0 || newSize >= originalSize) return null;
  return Math.round((1 - newSize / originalSize) * 100);
}
