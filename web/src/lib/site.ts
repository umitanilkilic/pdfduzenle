export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pdfduzenle.tr").replace(/\/$/, "");
export const SITE_NAME = "PDF Düzenle";
/** Public source code; the AGPL requires offering it to everyone who uses the site. */
export const SOURCE_URL = "https://github.com/umitanilkilic/pdfduzenle";
/** The person behind the site, for the footer and structured data. */
export const AUTHOR = { name: "Ümit Anıl Kılıç", linkedin: "https://www.linkedin.com/in/umitanilkilic" };
/** Other sites by the same author, linked from every page. */
export const SISTER_SITES = ["https://ipsorgu.tr", "https://packet.tr"];

export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}
