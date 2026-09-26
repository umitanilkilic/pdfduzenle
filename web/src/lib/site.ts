export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pdfduzenle.tr").replace(/\/$/, "");
export const SITE_NAME = "PDF Düzenle";

export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}
