export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pdfduzenle.tr").replace(/\/$/, "");
export const SITE_NAME = "PDF Düzenle";
export const SITE_DOMAIN = "pdfduzenle.tr";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;
}
