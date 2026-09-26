import { matchesAccept, readBytes } from "@/lib/files";
import { createLimiter } from "@/lib/limit";

export type PdfPageRenderer = (bytes: Uint8Array, maxSide: number) => Promise<Blob>;

/** Formats every browser can show in an <img> as they are. */
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Returns a preview image for a file: images as they are, the first page of a PDF, or null for other
 * types (Office documents). PDFs render a few at a time so a long merge list doesn't stall the page.
 */
export function createFileThumbnailer(renderPdf: PdfPageRenderer, concurrency = 2) {
  const limit = createLimiter(concurrency);
  return async function thumbnail(file: File, maxSide: number): Promise<Blob | null> {
    if (IMAGE_TYPES.has(file.type)) return file;
    if (!matchesAccept(file, "application/pdf,.pdf")) return null;
    return limit(async () => renderPdf(await readBytes(file), maxSide));
  };
}
