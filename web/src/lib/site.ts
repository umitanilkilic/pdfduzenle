export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pdfduzenle.tr").replace(/\/$/, "");
export const SITE_NAME = "PDF Düzenle";
/** Public source code; the AGPL requires offering it to everyone who uses the site. */
export const SOURCE_URL = "https://github.com/umitanilkilic/pdfduzenle";

export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}
